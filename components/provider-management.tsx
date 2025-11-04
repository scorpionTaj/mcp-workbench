"use client";

import { useState } from "react";
import logger from "@/lib/logger";
import { useCsrfToken } from "@/hooks/use-csrf";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Key,
  Globe,
  Server,
  CheckCircle2,
  XCircle,
  Edit,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useProviders } from "@/hooks/use-providers";
import type { LLMProviderStatus } from "@/lib/types";

const AVAILABLE_PROVIDERS = [
  { id: "ollama", name: "Ollama", type: "local", icon: Server },
  { id: "lmstudio", name: "LM Studio", type: "local", icon: Server },
  { id: "openai", name: "OpenAI", type: "remote", icon: Globe },
  { id: "anthropic", name: "Anthropic (Claude)", type: "remote", icon: Globe },
  { id: "google", name: "Google AI (Gemini)", type: "remote", icon: Globe },
  { id: "groq", name: "Groq", type: "remote", icon: Globe },
  { id: "openrouter", name: "OpenRouter", type: "remote", icon: Globe },
  { id: "together", name: "Together AI", type: "remote", icon: Globe },
  { id: "mistral", name: "Mistral AI", type: "remote", icon: Globe },
  { id: "cohere", name: "Cohere", type: "remote", icon: Globe },
  { id: "huggingface", name: "HuggingFace", type: "remote", icon: Globe },
  { id: "replicate", name: "Replicate", type: "remote", icon: Globe },
  { id: "custom", name: "Custom Provider", type: "local", icon: Server },
];

interface ProviderFormData {
  provider: string;
  name: string;
  type: "local" | "remote";
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
}

interface ProviderDialogProps {
  mode: "add" | "edit";
  existingProvider?: LLMProviderStatus;
  onClose?: () => void;
}

export function ProviderDialog({
  mode,
  existingProvider,
  onClose,
}: ProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ProviderFormData>(() => {
    if (mode === "edit" && existingProvider) {
      return {
        provider: existingProvider.provider,
        name: existingProvider.provider,
        type: existingProvider.type,
        baseUrl: "",
        apiKey: "",
        enabled: true,
      };
    }
    return {
      provider: "",
      name: "",
      type: "local",
      baseUrl: "",
      apiKey: "",
      enabled: true,
    };
  });
  const [saving, setSaving] = useState(false);
  const { refresh } = useProviders();
  const { secureFetch } = useCsrfToken();

  const handleProviderSelect = (providerId: string) => {
    const provider = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      setFormData({
        ...formData,
        provider: providerId,
        name: provider.name,
        type: provider.type as "local" | "remote",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await secureFetch("/api/providers/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          provider: "",
          name: "",
          type: "local",
          baseUrl: "",
          apiKey: "",
          enabled: true,
        });
        refresh();
        onClose?.();
      } else {
        const error = await response.json();
        alert(`Failed to save provider: ${error.error}`);
      }
    } catch (error) {
      logger.error({ err: error }, "Error saving provider");
      alert("Failed to save provider configuration");
    } finally {
      setSaving(false);
    }
  };

  const needsApiKey = formData.type === "remote";
  const needsBaseUrl =
    formData.provider === "custom" || formData.type === "local";
  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <Button className="gap-2 btn-glow">
            <Plus className="w-4 h-4" />
            Add Provider
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl sm:max-w-2xl p-0 glass border-border/50">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {isEdit ? (
                <>
                  <Edit className="w-6 h-6 text-primary" />
                  <span className="text-gradient">Edit Provider</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-primary" />
                  <span className="text-gradient">Add LLM Provider</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {isEdit
                ? "Update provider configuration and settings"
                : "Add a new local or remote LLM provider to your workbench"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-base font-semibold">
                Provider Type
              </Label>
              <Select
                value={formData.provider}
                onValueChange={handleProviderSelect}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Local Providers
                  </div>
                  {AVAILABLE_PROVIDERS.filter((p) => p.type === "local").map(
                    (provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          {provider.name}
                        </div>
                      </SelectItem>
                    )
                  )}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                    Remote Providers (API)
                  </div>
                  {AVAILABLE_PROVIDERS.filter((p) => p.type === "remote").map(
                    (provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {provider.name}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Provider type cannot be changed after creation
                </p>
              )}
            </div>

            {formData.provider && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="My Provider"
                  />
                </div>

                {needsBaseUrl && (
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      value={formData.baseUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, baseUrl: e.target.value })
                      }
                      placeholder="http://localhost:11434"
                    />
                    <p className="text-xs text-muted-foreground">
                      The base URL where your provider is running
                    </p>
                  </div>
                )}

                {needsApiKey && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Key
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, apiKey: e.target.value })
                      }
                      placeholder={
                        isEdit ? "Leave blank to keep existing" : "sk-..."
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {isEdit
                        ? "Only enter a new key if you want to update it"
                        : "Your API key is stored securely in the database"}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled" className="font-medium">
                      Enable Provider
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Disabled providers won't appear in provider lists
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enabled: checked })
                    }
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.provider || !formData.name || saving}
              className="btn-glow"
            >
              {saving
                ? "Saving..."
                : isEdit
                ? "Update Provider"
                : "Add Provider"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProviderDialog({
  provider,
  onDeleted,
}: {
  provider: LLMProviderStatus;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { secureFetch } = useCsrfToken();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await secureFetch(
        `/api/providers/config?provider=${provider.provider}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setOpen(false);
        onDeleted();
      } else {
        const error = await response.json();
        alert(`Failed to delete provider: ${error.error}`);
      }
    } catch (error) {
      logger.error({ err: error }, "Error deleting provider");
      alert("Failed to delete provider");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-strong">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{provider.provider}</strong>
            ? This action cannot be undone. Any saved configurations will be
            permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete Provider"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProviderManagementCard() {
  const { providers, isLoading, refresh } = useProviders();

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold mb-1">
                Active Providers
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your configured LLM providers
              </p>
            </div>
          </div>
          <ProviderDialog mode="add" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-12 h-12 mb-4 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm font-medium">Loading providers...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Server className="w-12 h-12 opacity-50" />
              </div>
              <p className="font-medium mb-1">No providers configured</p>
              <p className="text-sm mb-4">
                Add your first provider to get started
              </p>
              <ProviderDialog mode="add" />
            </div>
          ) : (
            providers.map((provider) => (
              <div
                key={provider.provider}
                className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-background/80 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div
                      className={`p-3 rounded-xl border transition-all duration-300 ${
                        provider.connected
                          ? "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20"
                          : "bg-muted/50 border-border/50 group-hover:bg-muted"
                      }`}
                    >
                      {provider.type === "local" ? (
                        <Server
                          className={`w-5 h-5 ${
                            provider.connected
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ) : (
                        <Globe
                          className={`w-5 h-5 ${
                            provider.connected
                              ? "text-blue-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </div>
                    {provider.connected && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base capitalize">
                        {provider.provider}
                      </h3>
                      <Badge
                        variant={
                          provider.type === "local" ? "secondary" : "outline"
                        }
                        className={`text-xs ${
                          provider.type === "local"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}
                      >
                        {provider.type}
                      </Badge>
                      {provider.hasApiKey === false &&
                        provider.type === "remote" && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20"
                          >
                            <Key className="w-3 h-3" />
                            No API Key
                          </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {provider.connected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">
                            Connected
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {provider.models.length}{" "}
                            {provider.models.length === 1 ? "model" : "models"}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-destructive" />
                          <span className="text-muted-foreground">
                            {provider.error || "Disconnected"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ProviderDialog
                    mode="edit"
                    existingProvider={provider}
                    onClose={refresh}
                  />
                  <DeleteProviderDialog
                    provider={provider}
                    onDeleted={refresh}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {providers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">
                    {providers.filter((p) => p.connected).length} Connected
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {providers.length} Total
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                disabled={isLoading}
                className="gap-2 hover:border-primary/50 hover:bg-primary/5"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
