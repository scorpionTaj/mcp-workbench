"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePythonEnv } from "@/hooks/use-python-env";
import {
  CheckCircle2,
  RefreshCw,
  Search,
  Settings,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PythonEnvSelector() {
  const {
    environments,
    selectedEnv,
    selectEnvironment,
    validateCustomPath,
    isValidating,
    isLoading,
    refresh,
  } = usePythonEnv();

  const [isOpen, setIsOpen] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [customError, setCustomError] = useState("");

  const handleSelectEnv = (env: any) => {
    selectEnvironment(env);
    setIsOpen(false);
  };

  const handleValidateCustomPath = async () => {
    setCustomError("");
    try {
      const env = await validateCustomPath(customPath);
      if (env) {
        selectEnvironment(env);
        setCustomPath("");
        setIsOpen(false);
      }
    } catch (error: any) {
      setCustomError(error.message || "Invalid Python path");
    }
  };

  const getEnvTypeColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "conda":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "venv":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "custom":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5"
          size="sm"
        >
          <Settings className="h-4 w-4" />
          {selectedEnv ? (
            <span className="flex items-center gap-2">
              {selectedEnv.name || "Python"}
              <Badge
                variant="secondary"
                className={cn("text-xs", getEnvTypeColor(selectedEnv.type))}
              >
                {selectedEnv.version}
              </Badge>
            </span>
          ) : (
            "Select Python Environment"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl sm:max-w-3xl p-0 glass border-border/50">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Python Environment
            </DialogTitle>
            <DialogDescription className="text-base">
              Select a Python environment for running code or add a custom path
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Detected Environments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Detected Environments ({environments.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                  className="cursor-pointer hover:bg-primary/5"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isLoading && "animate-spin")}
                  />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 glass rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : environments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center glass rounded-lg border-dashed border-2 border-border/50">
                  <AlertCircle className="h-16 w-16 mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    No Python environments detected
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Add a custom path below or install Python
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {environments.map((env, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectEnv(env)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all cursor-pointer glass",
                        "hover:bg-accent hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                        selectedEnv?.path === env.path
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/20"
                          : "border-border/50 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{env.name}</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                getEnvTypeColor(env.type)
                              )}
                            >
                              {env.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {env.path}
                          </p>
                          <p className="text-xs font-medium text-primary/80">
                            Python {env.version}
                          </p>
                        </div>
                        {selectedEnv?.path === env.path && (
                          <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Path */}
            <div className="space-y-3 pt-6 border-t border-border/50">
              <Label className="text-base font-semibold">
                Custom Python Path
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="C:\Python311\python.exe"
                  value={customPath}
                  onChange={(e) => {
                    setCustomPath(e.target.value);
                    setCustomError("");
                  }}
                  className={cn(
                    "font-mono text-sm",
                    customError && "border-destructive"
                  )}
                />
                <Button
                  onClick={handleValidateCustomPath}
                  disabled={!customPath || isValidating}
                  className="cursor-pointer hover:bg-primary/90"
                >
                  {isValidating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {customError && (
                <p className="text-xs text-destructive flex items-center gap-1.5 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {customError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the full path to your Python executable (python.exe on
                Windows, python3 on Unix)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
