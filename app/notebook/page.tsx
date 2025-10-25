"use client";

import { useState, useRef } from "react";
import { NotebookCell } from "@/components/chat/enhanced-notebook-cell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PythonEnvSelector } from "@/components/python-env-selector";
import { IntegratedTerminal } from "@/components/integrated-terminal";
import {
  Plus,
  BookOpen,
  Terminal as TerminalIcon,
  Settings,
  Download,
  Upload,
  FolderOpen,
  Save,
  FileJson,
  Play,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Cell {
  id: string;
  code: string;
  name: string;
}

export default function NotebookPage() {
  const [cells, setCells] = useState<Cell[]>([
    { id: "1", code: "", name: "Cell 1" },
  ]);
  const [notebookName, setNotebookName] = useState("Untitled Notebook");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCell = (index?: number) => {
    const newCell: Cell = {
      id: Date.now().toString(),
      code: "",
      name: `Cell ${cells.length + 1}`,
    };
    if (index !== undefined) {
      const newCells = [...cells];
      newCells.splice(index + 1, 0, newCell);
      setCells(newCells);
    } else {
      setCells([...cells, newCell]);
    }
  };

  const removeCell = (id: string) => {
    if (cells.length > 1) {
      setCells(cells.filter((cell) => cell.id !== id));
    }
  };

  const moveCell = (id: string, direction: "up" | "down") => {
    const index = cells.findIndex((cell) => cell.id === id);
    if (index === -1) return;

    const newCells = [...cells];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < cells.length) {
      [newCells[index], newCells[targetIndex]] = [
        newCells[targetIndex],
        newCells[index],
      ];
      setCells(newCells);
    }
  };

  const renameCell = (id: string, name: string) => {
    setCells(cells.map((cell) => (cell.id === id ? { ...cell, name } : cell)));
  };

  const exportNotebook = () => {
    const notebook = {
      name: notebookName,
      cells: cells.map((cell) => ({
        name: cell.name,
        code: cell.code,
      })),
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notebookName.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importNotebook = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const notebook = JSON.parse(e.target?.result as string);
        setNotebookName(notebook.name || "Imported Notebook");
        setCells(
          notebook.cells.map((cell: any, index: number) => ({
            id: Date.now() + index,
            code: cell.code || "",
            name: cell.name || `Cell ${index + 1}`,
          }))
        );
      } catch (error) {
        console.error("Failed to import notebook:", error);
      }
    };
    reader.readAsText(file);
  };

  const runAllCells = async () => {
    // This would trigger execution of all cells sequentially
    console.log("Running all cells...");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Input
            value={notebookName}
            onChange={(e) => setNotebookName(e.target.value)}
            className="text-3xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 mb-2"
          />
          <p className="text-muted-foreground text-sm">
            Execute Python code with advanced environment management
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAllCells} variant="outline" className="gap-2">
            <Play className="w-4 h-4" />
            Run All
          </Button>
          <Button onClick={() => addCell()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Cell
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notebook" className="w-full">
        <TabsList className="grid w-full grid-cols-2 border-2 border-border/50 p-1">
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
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  Python Notebook Environment
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Write and execute Python code with support for data analysis,
                  visualization, and more. Code runs in a sandboxed environment
                  with restricted file system access.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>• matplotlib, seaborn for visualizations</p>
                  <p>• pandas, numpy for data analysis</p>
                  <p>• Save files to see them as artifacts</p>
                  <p>• Dangerous operations are blocked</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {cells.map((cell, index) => (
              <NotebookCell
                key={cell.id}
                id={cell.id}
                initialCode={cell.code}
                initialName={cell.name}
                index={index}
                canMoveUp={index > 0}
                canMoveDown={index < cells.length - 1}
                onDelete={() => removeCell(cell.id)}
                onMoveUp={() => moveCell(cell.id, "up")}
                onMoveDown={() => moveCell(cell.id, "down")}
                onRename={(name) => renameCell(cell.id, name)}
              />
            ))}
          </div>

          {cells.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cells</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add a cell to start writing Python code
              </p>
              <Button onClick={() => addCell()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Cell
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="p-6 border-border/50 bg-linear-to-br from-card to-card/50">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">
                  Python Environment
                </Label>
                <PythonEnvSelector />
                <p className="text-xs text-muted-foreground mt-2">
                  Auto-detects Python installations or add custom paths
                </p>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Label className="text-base font-semibold mb-4 block">
                  Notebook Actions
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={exportNotebook}
                    variant="outline"
                    className="gap-2 justify-start"
                  >
                    <Download className="w-4 h-4" />
                    Export Notebook
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="gap-2 justify-start"
                  >
                    <Upload className="w-4 h-4" />
                    Import Notebook
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start">
                    <Save className="w-4 h-4" />
                    Save Notebook
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start">
                    <FolderOpen className="w-4 h-4" />
                    Open Workspace
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={importNotebook}
                  className="hidden"
                />
              </div>

              <div className="pt-4 border-t border-border/50">
                <Label className="text-base font-semibold mb-4 block">
                  Terminal
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Execute terminal commands directly in the notebook
                </p>
              </div>
            </div>
          </Card>

          <IntegratedTerminal />
        </TabsContent>
      </Tabs>
    </div>
  );
}
