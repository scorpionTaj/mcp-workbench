"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Loader2, CheckCircle2, XCircle, ImageIcon, FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotebookCellProps {
  initialCode?: string
  onExecute?: (result: any) => void
}

export function NotebookCell({ initialCode = "", onExecute }: NotebookCellProps) {
  const [code, setCode] = useState(initialCode)
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleExecute = async () => {
    setIsExecuting(true)
    setResult(null)

    try {
      const response = await fetch("/api/notebook/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      setResult(data)
      onExecute?.(data)
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Failed to execute code",
        stdout: "",
        stderr: "",
        images: [],
        artifacts: [],
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Python
          </Badge>
          {result && !result.error && <CheckCircle2 className="w-4 h-4 text-success" />}
          {result?.error && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
        <Button size="sm" onClick={handleExecute} disabled={isExecuting || !code.trim()}>
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run
            </>
          )}
        </Button>
      </div>

      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter Python code..."
        className="font-mono text-sm min-h-[120px]"
        disabled={isExecuting}
      />

      {result && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          {result.stdout && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4" />
                Output
              </div>
              <ScrollArea className="h-32">
                <pre className="text-xs font-mono bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">
                  {result.stdout}
                </pre>
              </ScrollArea>
            </div>
          )}

          {result.stderr && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <FileText className="w-4 h-4" />
                Warnings
              </div>
              <ScrollArea className="h-32">
                <pre className="text-xs font-mono bg-warning/10 p-3 rounded-lg border border-warning/20 whitespace-pre-wrap">
                  {result.stderr}
                </pre>
              </ScrollArea>
            </div>
          )}

          {result.error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <XCircle className="w-4 h-4" />
                Error
              </div>
              <pre className="text-xs font-mono bg-destructive/10 p-3 rounded-lg border border-destructive/20 whitespace-pre-wrap">
                {result.error}
              </pre>
            </div>
          )}

          {result.images && result.images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="w-4 h-4" />
                Images ({result.images.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {result.images.map((img: string, i: number) => (
                  <img
                    key={i}
                    src={img || "/placeholder.svg"}
                    alt={`Output ${i + 1}`}
                    className="rounded-lg border border-white/10 w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {result.artifacts && result.artifacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4" />
                Artifacts ({result.artifacts.length})
              </div>
              <div className="space-y-2">
                {result.artifacts.map((artifact: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{artifact.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {artifact.mime}
                      </Badge>
                    </div>
                    <ScrollArea className="h-24">
                      <pre className="text-xs font-mono whitespace-pre-wrap">{artifact.content}</pre>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
