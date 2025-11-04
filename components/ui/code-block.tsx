"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  fileName?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = true,
  fileName,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect language from className if not explicitly provided
  const detectedLanguage = language || detectLanguage(className);

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="text-xs font-mono text-muted-foreground">
              {fileName}
            </span>
          )}
          <span className="text-xs font-mono text-primary uppercase">
            {detectedLanguage}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={detectedLanguage}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "hsl(var(--card))",
            fontSize: "0.875rem",
          }}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            color: "hsl(var(--muted-foreground))",
            opacity: 0.5,
          }}
          wrapLines={true}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/**
 * Detect programming language from className or content
 */
function detectLanguage(className?: string): string {
  if (!className) return "text";

  // Extract language from className like "language-javascript" or "lang-js"
  const match = className.match(/(?:language|lang)-(\w+)/);
  if (match) {
    return normalizeLanguage(match[1]);
  }

  return "text";
}

/**
 * Normalize language names to Prism-supported languages
 */
function normalizeLanguage(lang: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    sh: "bash",
    yml: "yaml",
    md: "markdown",
    html: "markup",
    svg: "markup",
    xml: "markup",
  };

  return languageMap[lang.toLowerCase()] || lang.toLowerCase();
}

/**
 * Inline code component for small code snippets
 */
export function InlineCode({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={`px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary border border-border ${className}`}
    >
      {children}
    </code>
  );
}
