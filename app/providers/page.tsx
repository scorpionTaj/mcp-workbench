"use client";

import { ProviderManagementCard } from "@/components/provider-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Globe,
  Shield,
  Zap,
  Lock,
  Cloud,
  HardDrive,
  CheckCircle2,
  Key,
} from "lucide-react";

export default function ProvidersPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">
              LLM Providers
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Configure and manage your AI model providers
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <HardDrive className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Local Providers</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Cloud className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Remote Providers
                </p>
                <p className="text-2xl font-bold">10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Zap className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Available</p>
                <p className="text-2xl font-bold">13</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Security</p>
                <p className="text-sm font-semibold">
                  Supabase Storage With RLS Policies and Encryption
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Management */}
      <ProviderManagementCard />

      {/* Provider Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Providers Card */}
        <Card className="glass border-border/50 hover:border-emerald-500/30 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                <HardDrive className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-gradient">Local Providers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Run AI models locally on your machine for complete privacy and
              control. No internet required once models are downloaded.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-emerald-500/30 transition-all">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <Server className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">Ollama</h4>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                      Popular
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Easy to use, supports many open-source models. Great for
                    beginners.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-emerald-500/30 transition-all">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <Server className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">LM Studio</h4>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                      GUI-Based
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Graphical interface with built-in model browser and
                    management.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-emerald-500/30 transition-all">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <Server className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">Custom Provider</h4>
                    <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs">
                      Advanced
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connect to any OpenAI-compatible API endpoint running
                    locally.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Privacy First:</strong>{" "}
                  All processing happens on your device. No data leaves your
                  machine.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remote Providers Card */}
        <Card className="glass border-border/50 hover:border-blue-500/30 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <Cloud className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-gradient">Remote Providers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access state-of-the-art AI models via cloud APIs. Requires API
              keys from the respective providers.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {[
                { name: "OpenAI", models: "GPT-4, GPT-3.5", color: "emerald" },
                { name: "Anthropic", models: "Claude 3.5", color: "violet" },
                { name: "Google", models: "Gemini Pro", color: "blue" },
                { name: "Groq", models: "Ultra Fast", color: "amber" },
                { name: "OpenRouter", models: "Multi-Model", color: "pink" },
                { name: "Together AI", models: "Open Models", color: "cyan" },
                { name: "Mistral AI", models: "Mistral", color: "orange" },
                { name: "Cohere", models: "Command R", color: "green" },
                {
                  name: "HuggingFace",
                  models: "Open & Image",
                  color: "yellow",
                },
                { name: "Replicate", models: "FLUX & More", color: "purple" },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50 border border-border/50 hover:border-blue-500/30 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs">{provider.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {provider.models}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Key className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">
                    API Keys Required:
                  </strong>{" "}
                  Sign up on provider websites to obtain API keys. Keys are
                  stored securely in your local database.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="glass border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Security & Privacy
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Local-First
                </Badge>
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    All API keys and configurations are stored in your Supabase
                    database
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    No data is sent to external servers except when making API
                    calls to your configured providers
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    For production deployments, consider using environment
                    variables or a secure key management service
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="font-medium text-amber-600 dark:text-amber-500">
                    Never commit API keys to version control or share them
                    publicly
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
