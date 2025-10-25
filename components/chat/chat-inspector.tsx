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
    <Card className="w-80 flex-shrink-0 flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <TabsList className="grid w-full grid-cols-5 rounded-none border-b-2 border-border/50 p-1">
          <TabsTrigger
            value="traces"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Activity className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Coins className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Wrench className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger
            value="citations"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <FileText className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger
            value="attachments"
            className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Paperclip className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="traces" className="p-4 space-y-3 mt-0">
            <h3 className="font-semibold text-sm mb-3">Tool Call Timeline</h3>
            {toolCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tool calls yet</p>
            ) : (
              toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{tc.toolName}</span>
                    {tc.error ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : tc.output ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(tc.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {tc.error && (
                    <p className="text-xs text-destructive">{tc.error}</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="tokens" className="p-4 space-y-3 mt-0">
            <h3 className="font-semibold text-sm mb-3">Token Usage</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Input Tokens
                  </span>
                  <span className="text-lg font-semibold">
                    {totalTokensIn.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Output Tokens
                  </span>
                  <span className="text-lg font-semibold">
                    {totalTokensOut.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">
                    {(totalTokensIn + totalTokensOut).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-xs font-semibold mb-2">Per Message</h4>
              <div className="space-y-2">
                {messages
                  .filter((m) => m.tokensIn || m.tokensOut)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground truncate flex-1">
                        {msg.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span className="font-mono">
                        {(msg.tokensIn || 0) + (msg.tokensOut || 0)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="p-4 space-y-3 mt-0">
            <h3 className="font-semibold text-sm mb-3">Enabled Tools</h3>
            {enabledTools.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tools enabled for this chat
              </p>
            ) : (
              enabledTools.map((toolId) => (
                <div
                  key={toolId}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <span className="text-sm">{toolId}</span>
                  <Switch
                    checked={true}
                    onCheckedChange={() => onToolToggle(toolId)}
                  />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="citations" className="p-4 space-y-3 mt-0">
            <h3 className="font-semibold text-sm mb-3">Citations</h3>
            <p className="text-sm text-muted-foreground">
              Citations will appear here when using RAG tools
            </p>
          </TabsContent>

          <TabsContent value="attachments" className="p-4 space-y-3 mt-0">
            <h3 className="font-semibold text-sm mb-3">Attachments</h3>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments</p>
            ) : (
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
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
