"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Coins,
  Wrench,
  FileText,
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ChatInspectorProps {
  messages: any[];
  enabledTools: string[];
  onToolToggle: (toolId: string) => void;
}

export function ChatInspector({
  messages,
  enabledTools,
  onToolToggle,
}: ChatInspectorProps) {
  const [activeTab, setActiveTab] = useState("traces");

  // Remember last active tab
  useEffect(() => {
    const saved = localStorage.getItem("inspector-tab");
    if (saved) setActiveTab(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("inspector-tab", activeTab);
  }, [activeTab]);

  // Calculate token totals
  const totalTokensIn = messages.reduce(
    (sum, msg) => sum + (msg.tokensIn || 0),
    0
  );
  const totalTokensOut = messages.reduce(
    (sum, msg) => sum + (msg.tokensOut || 0),
    0
  );

  // Extract tool calls
  const toolCalls = messages.flatMap((msg) =>
    (msg.toolCalls || []).map((tc: any) => ({
      ...tc,
      messageId: msg.id,
      timestamp: msg.createdAt,
    }))
  );

  // Extract attachments
  const attachments = messages.flatMap((msg) =>
    (msg.attachments || []).map((att: any) => ({
      ...att,
      messageId: msg.id,
    }))
  );

  return (
    <Card className="w-80 shrink-0 flex flex-col h-full glass border-border/50">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <TabsList className="grid w-full grid-cols-5 rounded-none border-b glass border-border/50 p-1">
          <TabsTrigger
            value="traces"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Activity className="w-3 h-3 cursor-pointer" />
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Coins className="w-3 h-3 cursor-pointer" />
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Wrench className="w-3 h-3 cursor-pointer" />
          </TabsTrigger>
          <TabsTrigger
            value="citations"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <FileText className="w-3 h-3 cursor-pointer" />
          </TabsTrigger>
          <TabsTrigger
            value="attachments"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Paperclip className="w-3 h-3 cursor-pointer" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="traces" className="p-4 space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Activity className="w-4 h-4 text-violet-500" />
              </div>
              <h3 className="font-semibold text-sm">Tool Call Timeline</h3>
            </div>
            {toolCalls.length === 0 ? (
              <div className="text-center py-8 glass rounded-lg border-dashed border-2 border-border/50">
                <Activity className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No tool calls yet
                </p>
              </div>
            ) : (
              toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg glass border-border/50 space-y-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{tc.toolName}</span>
                    {tc.error ? (
                      <div className="p-1 rounded bg-destructive/10 border border-destructive/20">
                        <XCircle className="w-4 h-4 text-destructive" />
                      </div>
                    ) : tc.output ? (
                      <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(tc.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {tc.error && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                      {tc.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="tokens" className="p-4 space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Coins className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-semibold text-sm">Token Usage</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-lg glass border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Input Tokens
                  </span>
                  <span className="text-xl font-bold text-emerald-500">
                    {totalTokensIn.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg glass border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Output Tokens
                  </span>
                  <span className="text-xl font-bold text-violet-500">
                    {totalTokensOut.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg glass border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {(totalTokensIn + totalTokensOut).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                <span>Per Message</span>
              </h4>
              <div className="space-y-2">
                {messages
                  .filter((m) => m.tokensIn || m.tokensOut)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between text-xs p-2 rounded glass border-border/50"
                    >
                      <span className="text-muted-foreground truncate flex-1">
                        {msg.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span className="font-mono font-semibold">
                        {(msg.tokensIn || 0) + (msg.tokensOut || 0)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="p-4 space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-semibold text-sm">Enabled Tools</h3>
            </div>
            {enabledTools.length === 0 ? (
              <div className="text-center py-8 glass rounded-lg border-dashed border-2 border-border/50">
                <Wrench className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No tools enabled for this chat
                </p>
              </div>
            ) : (
              enabledTools.map((toolId) => (
                <div
                  key={toolId}
                  className="flex items-center justify-between p-3 rounded-lg glass border-border/50 hover:border-primary/30 transition-colors"
                >
                  <span className="text-sm font-medium">{toolId}</span>
                  <Switch
                    checked={true}
                    onCheckedChange={() => onToolToggle(toolId)}
                  />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="citations" className="p-4 space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-sm">Citations</h3>
            </div>
            <div className="text-center py-8 glass rounded-lg border-dashed border-2 border-border/50">
              <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Citations will appear here when using RAG tools
              </p>
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="p-4 space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Paperclip className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-semibold text-sm">Attachments</h3>
            </div>
            {attachments.length === 0 ? (
              <div className="text-center py-8 glass rounded-lg border-dashed border-2 border-border/50">
                <Paperclip className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No attachments</p>
              </div>
            ) : (
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-lg glass border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold truncate">
                      {att.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {att.mime}
                    </Badge>
                    <span>{(att.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}
