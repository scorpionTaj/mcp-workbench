"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import type { NotebookCellData } from "@/lib/notebook";
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
  Eye,
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
    <div className="h-[200px] flex items-center justify-center border border-border/50 rounded-md bg-default/20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface NotebookCellProps {
  cell: NotebookCellData;
  index: number;
  isExecuting: boolean;
  onRun: () => void;
  onChange: (source: string) => void;
  onRename: (name: string) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/** One notebook cell. Code, outputs and execution belong to the page, so it can save and Run All. */
export function NotebookCell({
  cell,
  index,
  isExecuting,
  onRun,
  onChange,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: NotebookCellProps) {
  const code = cell.source;
  const result = cell.output;
  const isMarkdown = cell.type === "markdown";
  const [cellName, setCellName] = useState(cell.name || (isMarkdown ? "Text" : `Cell ${index + 1}`));
  const [isEditingName, setIsEditingName] = useState(false);
  // Markdown cells open in preview unless they're empty.
  const [editingText, setEditingText] = useState(!cell.source.trim());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const handleExportCell = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cellName.replace(/\s+/g, "_")}.${isMarkdown ? "md" : "py"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRename = () => {
    setIsEditingName(false);
    onRename(cellName);
  };

  return (
    <Card className="p-5 border-border/50 glass hover:border-primary/30 transition-all group hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {isMarkdown ? (
            <Badge
              variant="secondary"
              className="text-xs shrink-0 bg-sky-500/10 text-sky-500 border-sky-500/20"
            >
              Markdown
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-xs shrink-0 bg-violet-500/10 text-violet-500 border-violet-500/20"
            >
              Python
            </Badge>
          )}
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
          {!isMarkdown && result && !result.error && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          {!isMarkdown && result?.error && <XCircle className="w-5 h-5 text-destructive" />}
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

          {isMarkdown ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingText(!editingText)}
              disabled={editingText && !code.trim()}
              className="gap-2"
            >
              {editingText ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              {editingText ? "Preview" : "Edit"}
            </Button>
          ) : (
          <Button
            size="sm"
            onClick={onRun}
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
          )}
        </div>
      </div>

      {isMarkdown && !editingText ? (
        <div
          className="rounded-lg border border-transparent px-1 hover:border-border/50 cursor-text"
          onDoubleClick={() => setEditingText(true)}
          title="Double-click to edit"
        >
          <MarkdownRenderer content={code} />
        </div>
      ) : (
      <div className="relative">
        <CodeMirror
          value={code}
          height={isMarkdown ? "120px" : "200px"}
          theme={vscodeDark}
          extensions={isMarkdown ? [] : [python()]}
          onChange={onChange}
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
      )}

      {!isMarkdown && result && (
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

          {result.images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                </div>
                Images ({result.images.length})
              </div>
              <div className="grid grid-cols-2 gap-3">
                {result.images.map((img, i) => (
                  // Figures are inline PNG data URLs; next/image has nothing to optimize.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt={`Figure ${i + 1}`}
                    className="rounded-lg border border-border/50 w-full hover:border-primary/50 transition-colors"
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </Card>
  );
}
