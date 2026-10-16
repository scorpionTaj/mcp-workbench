"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { NotebookCell } from "@/components/chat/enhanced-notebook-cell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  BookOpen,
  Terminal as TerminalIcon,
  Download,
  Upload,
  FolderOpen,
  Save,
  FileJson,
  Play,
  Type,
  FilePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/fetcher";
import { runPython } from "@/lib/pyodide";
import {
  fromLegacy,
  newCellId,
  notebookToIpynb,
  parseNotebookFile,
  type NotebookCellData,
  type NotebookInput,
} from "@/lib/notebook";

interface NotebookSummary {
  id: string;
  title: string;
  cellCount: number;
  updatedAt: string;
}

const UNTITLED = "Untitled Notebook";
const LEGACY_KEY = /^notebook_\d+$/;
const LEGACY_DISMISSED = "notebook_import_dismissed";

const codeCell = (n: number): NotebookCellData => ({
  id: newCellId(),
  type: "code",
  name: `Cell ${n}`,
  source: "",
  output: null,
});

const markdownCell = (): NotebookCellData => ({
  id: newCellId(),
  type: "markdown",
  name: "Text",
  source: "",
  output: null,
});

/** Notebooks the page used to keep in this browser's localStorage, before saving to the account. */
function legacyNotebookKeys(): string[] {
  try {
    if (localStorage.getItem(LEGACY_DISMISSED)) return [];
    return Object.keys(localStorage).filter((k) => LEGACY_KEY.test(k));
  } catch {
    return [];
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

function setUrlId(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history.replaceState(null, "", url);
}

export default function NotebookPage() {
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [notebookName, setNotebookName] = useState(UNTITLED);
  const [cells, setCells] = useState<NotebookCellData[]>(() => [codeCell(1)]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [opening, setOpening] = useState(false);
  const [legacyKeys, setLegacyKeys] = useState<string[]>([]);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cellsRef = useRef(cells);
  const { toast } = useToast();

  const {
    data: saved,
    isLoading: loadingSaved,
    mutate: refreshSaved,
  } = useSWR<NotebookSummary[]>(opening ? "/api/notebooks" : null, fetcher);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  const editCells = (update: (cells: NotebookCellData[]) => NotebookCellData[]) => {
    setCells(update);
    setDirty(true);
  };

  const patchCell = (id: string, patch: Partial<NotebookCellData>) =>
    editCells((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const loadInto = (id: string | null, nb: NotebookInput, isDirty: boolean) => {
    setNotebookId(id);
    setNotebookName(nb.title);
    setCells(nb.cells.length ? nb.cells : [codeCell(1)]);
    setDirty(isDirty);
    setUrlId(id);
  };

  const openNotebook = useCallback(
    async (id: string) => {
      try {
        const nb = await api<NotebookInput & { id: string }>(`/api/notebooks/${id}`);
        loadInto(nb.id, nb, false);
        setOpening(false);
      } catch (error) {
        setUrlId(null);
        toast({
          title: "Couldn't open notebook",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Reopen the notebook named in the URL, and look for notebooks left in localStorage.
  // Both only exist in the browser, so they're read after the first (server-matching) render.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const legacy = legacyNotebookKeys();
    queueMicrotask(() => {
      setLegacyKeys(legacy);
      if (id) void openNotebook(id);
    });
  }, [openNotebook]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addCell = (cell: NotebookCellData = codeCell(cells.filter((c) => c.type === "code").length + 1)) =>
    editCells((cs) => [...cs, cell]);

  const removeCell = (id: string) => {
    if (cells.length > 1) editCells((cs) => cs.filter((cell) => cell.id !== id));
  };

  const moveCell = (id: string, direction: "up" | "down") =>
    editCells((cs) => {
      const index = cs.findIndex((cell) => cell.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || target < 0 || target >= cs.length) return cs;
      const next = [...cs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const runCell = async (id: string) => {
    const cell = cellsRef.current.find((c) => c.id === id);
    if (!cell || cell.type !== "code" || !cell.source.trim()) return true;
    setRunning((r) => new Set(r).add(id));
    const { stdout, stderr, images, error } = await runPython(cell.source);
    patchCell(id, { output: { stdout, stderr, images, ...(error ? { error } : {}) } });
    setRunning((r) => {
      const next = new Set(r);
      next.delete(id);
      return next;
    });
    return !error;
  };

  // Like Jupyter's "Run All": top to bottom, stopping at the first error.
  const runAllCells = async () => {
    for (const { id } of cellsRef.current) {
      if (!(await runCell(id))) break;
    }
  };

  const newNotebook = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    loadInto(null, { title: UNTITLED, cells: [] }, false);
  };

  const saveNotebook = async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({ title: notebookName.trim() || UNTITLED, cells });
      const nb = notebookId
        ? await api<{ id: string }>(`/api/notebooks/${notebookId}`, { method: "PATCH", body })
        : await api<{ id: string }>("/api/notebooks", { method: "POST", body });
      setNotebookId(nb.id);
      setUrlId(nb.id);
      setDirty(false);
      void refreshSaved();
      toast({ title: "Notebook saved", description: `Saved "${notebookName}" to your account` });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveRef = useRef(saveNotebook);
  useEffect(() => {
    saveRef.current = saveNotebook;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deleteNotebook = async (nb: NotebookSummary) => {
    if (!confirm(`Delete "${nb.title}"? This can't be undone.`)) return;
    try {
      await api(`/api/notebooks/${nb.id}`, { method: "DELETE" });
      void refreshSaved();
      // The open copy stays on screen as an unsaved notebook.
      if (nb.id === notebookId) {
        setNotebookId(null);
        setUrlId(null);
        setDirty(true);
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const exportNotebook = () => {
    const ipynb = notebookToIpynb(notebookName, cells);
    const blob = new Blob([JSON.stringify(ipynb, null, 1)], { type: "application/x-ipynb+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notebookName.replace(/\s+/g, "_") || "notebook"}.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importNotebook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (dirty && !confirm("Discard unsaved changes?")) return;
    try {
      const nb = parseNotebookFile(await file.text(), file.name);
      // Imports open as a new, unsaved notebook.
      loadInto(null, nb, true);
      toast({ title: "Notebook imported", description: `Imported "${nb.title}". Save it to keep it.` });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid notebook file",
        variant: "destructive",
      });
    }
  };

  const importLegacy = async () => {
    setImportingLegacy(true);
    let imported = 0;
    try {
      for (const key of legacyKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const nb = fromLegacy(JSON.parse(raw));
          await api("/api/notebooks", { method: "POST", body: JSON.stringify(nb) });
        }
        localStorage.removeItem(key);
        imported++;
      }
      localStorage.removeItem("last_notebook");
      toast({ title: "Notebooks imported", description: `Moved ${imported} notebook(s) to your account` });
    } catch (error) {
      toast({
        title: "Import stopped",
        description: `${imported} imported; ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setImportingLegacy(false);
      setLegacyKeys(legacyNotebookKeys());
      void refreshSaved();
    }
  };

  const dismissLegacy = () => {
    try {
      localStorage.setItem(LEGACY_DISMISSED, "1");
    } catch {}
    setLegacyKeys([]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 flex items-start gap-4">
          <BookOpen className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div className="flex-1">
            <Input
              value={notebookName}
              onChange={(e) => {
                setNotebookName(e.target.value);
                setDirty(true);
              }}
              className="text-3xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 mb-2 text-gradient"
              placeholder={UNTITLED}
            />
            <p className="text-muted-foreground text-lg">
              {notebookId ? (dirty ? "Unsaved changes" : "Saved to your account") : "Not saved yet"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 shrink-0">
          <Button onClick={() => setOpening(true)} variant="outline" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Open
          </Button>
          <Button onClick={saveNotebook} variant="outline" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
          <Button
            onClick={runAllCells}
            variant="outline"
            disabled={running.size > 0}
            className="gap-2 hover:border-primary/50 hover:bg-primary/5"
          >
            <Play className="w-4 h-4" />
            Run All
          </Button>
          <Button onClick={() => addCell()} className="gap-2 hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Cell
          </Button>
        </div>
      </div>

      {legacyKeys.length > 0 && (
        <Card className="p-4 glass border-primary/30 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {legacyKeys.length} notebook{legacyKeys.length === 1 ? " is" : "s are"} saved only in this
            browser. Import {legacyKeys.length === 1 ? "it" : "them"} to your account?
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={dismissLegacy} disabled={importingLegacy}>
              Not now
            </Button>
            <Button size="sm" onClick={importLegacy} disabled={importingLegacy} className="gap-2">
              {importingLegacy && <Loader2 className="w-4 h-4 animate-spin" />}
              Import
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={opening} onOpenChange={setOpening}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Your notebooks</DialogTitle>
            <DialogDescription>Notebooks saved to your account</DialogDescription>
          </DialogHeader>
          <Button variant="outline" className="gap-2 justify-start" onClick={() => { newNotebook(); setOpening(false); }}>
            <FilePlus className="w-4 h-4" />
            New notebook
          </Button>
          {loadingSaved ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !saved?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No saved notebooks yet</p>
          ) : (
            <ul className="space-y-2">
              {saved.map((nb) => (
                <li
                  key={nb.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:border-primary/40"
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      if (dirty && nb.id !== notebookId && !confirm("Discard unsaved changes?")) return;
                      void openNotebook(nb.id);
                    }}
                  >
                    <p className="font-medium truncate">
                      {nb.title}
                      {nb.id === notebookId && <span className="text-xs text-muted-foreground"> (open)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nb.cellCount} cell{nb.cellCount === 1 ? "" : "s"} · updated{" "}
                      {formatDistanceToNow(new Date(nb.updatedAt), { addSuffix: true })}
                    </p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${nb.title}`}
                    onClick={() => deleteNotebook(nb)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="notebook" className="w-full">
        <TabsList className="grid w-full grid-cols-2 glass border-border/50 p-1">
          <TabsTrigger
            value="notebook"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            Notebook
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notebook" className="space-y-4 mt-6">
          <Card className="p-5 glass border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <TerminalIcon className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-lg">
                  Python Notebook Environment
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Write and execute Python code with support for data analysis,
                  visualization, and more. Code runs entirely in your browser
                  (Pyodide / WebAssembly), so nothing executes on the server.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>• matplotlib, seaborn figures show under the cell</p>
                  <p>• pandas, numpy for data analysis</p>
                  <p>• Packages auto-load from imports</p>
                  <p>• Variables persist across cells</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {cells.map((cell, index) => (
              <NotebookCell
                key={cell.id}
                cell={cell}
                index={index}
                isExecuting={running.has(cell.id)}
                canMoveUp={index > 0}
                canMoveDown={index < cells.length - 1}
                onRun={() => void runCell(cell.id)}
                onChange={(source) => patchCell(cell.id, { source })}
                onRename={(name) => patchCell(cell.id, { name })}
                onDelete={() => removeCell(cell.id)}
                onMoveUp={() => moveCell(cell.id, "up")}
                onMoveDown={() => moveCell(cell.id, "down")}
              />
            ))}
          </div>

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => addCell()} className="gap-2">
              <Plus className="w-4 h-4" />
              Code
            </Button>
            <Button variant="outline" onClick={() => addCell(markdownCell())} className="gap-2">
              <Type className="w-4 h-4" />
              Text
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="p-6 glass border-border/50">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <FileJson className="w-4 h-4 text-blue-500" />
                  </div>
                  <Label className="text-base font-semibold">
                    Notebook Actions
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={exportNotebook}
                    variant="outline"
                    className="gap-2 justify-start hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Download className="w-4 h-4" />
                    Export .ipynb
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="gap-2 justify-start hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Upload className="w-4 h-4" />
                    Import .ipynb
                  </Button>
                  <Button
                    onClick={saveNotebook}
                    variant="outline"
                    disabled={saving}
                    className="gap-2 justify-start hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Save className="w-4 h-4" />
                    Save to account
                  </Button>
                  <Button
                    onClick={() => setOpening(true)}
                    variant="outline"
                    className="gap-2 justify-start hover:border-primary/50 hover:bg-primary/5"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Open saved notebook
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ipynb,.json,application/x-ipynb+json,application/json"
                  onChange={importNotebook}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
