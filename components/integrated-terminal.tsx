"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Terminal,
  X,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalLine {
  type: "input" | "output" | "error";
  content: string;
  timestamp: Date;
}

export function IntegratedTerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [lines]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // Add input line
    setLines((prev) => [
      ...prev,
      { type: "input", content: command, timestamp: new Date() },
    ]);

    setIsExecuting(true);
    setCurrentInput("");

    try {
      const response = await fetch("/api/terminal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      if (data.error) {
        setLines((prev) => [
          ...prev,
          { type: "error", content: data.error, timestamp: new Date() },
        ]);
      } else {
        if (data.stdout) {
          setLines((prev) => [
            ...prev,
            { type: "output", content: data.stdout, timestamp: new Date() },
          ]);
        }
        if (data.stderr) {
          setLines((prev) => [
            ...prev,
            { type: "error", content: data.stderr, timestamp: new Date() },
          ]);
        }
      }
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          type: "error",
          content: `Failed to execute command: ${error}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isExecuting) {
      executeCommand(currentInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex =
          historyIndex === -1
            ? history.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(history.length - 1, historyIndex + 1);
        if (newIndex === history.length - 1) {
          setHistoryIndex(-1);
          setCurrentInput("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(history[newIndex]);
        }
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      clearTerminal();
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const copyAllOutput = () => {
    const text = lines.map((line) => line.content).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors"
        >
          <Terminal className="h-4 w-4" />
          Integrated Terminal
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAllOutput}
              disabled={lines.length === 0}
              className="h-7 px-2 cursor-pointer"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTerminal}
              disabled={lines.length === 0}
              className="h-7 px-2 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 px-2 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Terminal Content */}
      {isOpen && (
        <div className="bg-black/95 text-green-400 font-mono text-sm">
          <ScrollArea className="h-64" ref={scrollAreaRef}>
            <div className="p-4 space-y-1">
              {lines.length === 0 ? (
                <div className="text-gray-500 text-xs">
                  Terminal ready. Type a command and press Enter...
                </div>
              ) : (
                lines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      "whitespace-pre-wrap wrap-break-word",
                      line.type === "input" && "text-cyan-400",
                      line.type === "error" && "text-red-400",
                      line.type === "output" && "text-green-400"
                    )}
                  >
                    {line.type === "input" && "$ "}
                    {line.content}
                  </div>
                ))
              )}
              {isExecuting && (
                <div className="text-yellow-400 animate-pulse">
                  Executing...
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-gray-700 p-2 flex items-center gap-2">
            <span className="text-cyan-400">$</span>
            <Input
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Type command..."
              className="bg-transparent border-none text-green-400 placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono"
            />
          </div>

          {/* Help Text */}
          <div className="px-4 py-2 text-xs text-gray-600 border-t border-gray-700">
            Press Enter to execute • ↑↓ for history • Ctrl+L to clear
          </div>
        </div>
      )}
    </div>
  );
}
