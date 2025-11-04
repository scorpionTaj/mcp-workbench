"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePythonEnv } from "@/hooks/use-python-env";
import dynamic from "next/dynamic";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ImageIcon,
  FileText,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Copy,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { python } from "@codemirror/lang-python";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

// Dynamically import CodeMirror (only loads on client side)
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] flex items-center justify-center border border-border/50 rounded-md bg-muted/20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface NotebookCellProps {
  id: string;
  initialCode?: string;
  initialName?: string;
  onExecute?: (result: any) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRename?: (name: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  index: number;
}

export function NotebookCell({
  id,
  initialCode = "",
  initialName = "",
  onExecute,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRename,
  canMoveUp,
  canMoveDown,
  index,
}: NotebookCellProps) {
  const [code, setCode] = useState(initialCode);
  const [cellName, setCellName] = useState(initialName || `Cell ${index + 1}`);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { selectedEnv } = usePythonEnv();

  const handleExecute = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch("/api/notebook/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          pythonPath: selectedEnv?.path,
        }),
      });

      const data = await response.json();
      setResult(data);
      onExecute?.(data);
    } catch (error) {
      setResult({
        error:
          error instanceof Error ? error.message : "Failed to execute code",
        stdout: "",
        stderr: "",
        images: [],
        artifacts: [],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const handleExportCell = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cellName.replace(/\s+/g, "_")}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRename = () => {
    setIsEditingName(false);
    onRename?.(cellName);
  };

  return (
    <Card className="p-5 border-border/50 glass hover:border-primary/30 transition-all group hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Badge
            variant="secondary"
            className="text-xs shrink-0 bg-violet-500/10 text-violet-500 border-violet-500/20"
          >
            Python
          </Badge>
          {isEditingName ? (
            <Input
              value={cellName}
              onChange={(e) => setCellName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="h-7 w-48 text-sm"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{cellName}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          )}
          {result && !result.error && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          {result?.error && <XCircle className="w-5 h-5 text-destructive" />}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border/50">
              <DropdownMenuItem
                onClick={handleCopyCode}
                className="cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCell}
                className="cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Cell
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Cell
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || !code.trim()}
            className="gap-2 hover:bg-primary/90"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <CodeMirror
          value={code}
          height="200px"
          theme={vscodeDark}
          extensions={[python()]}
          onChange={(value) => setCode(value)}
          editable={!isExecuting}
          className="rounded-lg overflow-hidden border border-border/50"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>

      {result && (
        <div className="space-y-3 pt-4 mt-4 border-t border-border/50">
          {result.stdout && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <FileText className="w-4 h-4 text-emerald-500" />
                </div>
                Output
              </div>
              <ScrollArea className="max-h-48">
                <pre className="text-xs font-mono glass border-emerald-500/20 p-3 rounded-lg whitespace-pre-wrap">
                  {result.stdout}
                </pre>
              </ScrollArea>
            </div>
          )}

          {result.stderr && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                  <FileText className="w-4 h-4" />
                </div>
                Warnings
              </div>
              <ScrollArea className="max-h-48">
                <pre className="text-xs font-mono glass border-amber-500/20 p-3 rounded-lg whitespace-pre-wrap">
                  {result.stderr}
                </pre>
              </ScrollArea>
            </div>
          )}

          {result.error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <div className="p-1.5 rounded bg-destructive/10 border border-destructive/20">
                  <XCircle className="w-4 h-4" />
                </div>
                Error
              </div>
              <pre className="text-xs font-mono bg-destructive/10 p-3 rounded-lg border border-destructive/20 whitespace-pre-wrap">
                {result.error}
              </pre>
            </div>
          )}

          {result.images && result.images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                </div>
                Images ({result.images.length})
              </div>
              <div className="grid grid-cols-2 gap-3">
                {result.images.map((img: string, i: number) => (
                  <img
                    key={i}
                    src={img || "/placeholder.svg"}
                    alt={`Output ${i + 1}`}
                    className="rounded-lg border border-border/50 w-full hover:border-primary/50 transition-colors"
                  />
                ))}
              </div>
            </div>
          )}

          {result.artifacts && result.artifacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                Artifacts ({result.artifacts.length})
              </div>
              <div className="space-y-2">
                {result.artifacts.map((artifact: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg glass border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {artifact.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {artifact.mime}
                      </Badge>
                    </div>
                    <ScrollArea className="h-24">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {artifact.content}
                      </pre>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
