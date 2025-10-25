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
        <Button variant="outline" className="gap-2 cursor-pointer" size="sm">
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Python Environment</DialogTitle>
          <DialogDescription>
            Select a Python environment for running code or add a custom path
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detected Environments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Detected Environments ({environments.length})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
                className="cursor-pointer"
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
                    className="h-16 bg-muted rounded-md animate-pulse"
                  />
                ))}
              </div>
            ) : environments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No Python environments detected</p>
                <p className="text-xs mt-1">
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
                      "w-full p-3 rounded-md border-2 text-left transition-all cursor-pointer",
                      "hover:bg-accent hover:border-primary/50",
                      selectedEnv?.path === env.path
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {env.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", getEnvTypeColor(env.type))}
                          >
                            {env.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {env.path}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Python {env.version}
                        </p>
                      </div>
                      {selectedEnv?.path === env.path && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Path */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Custom Python Path</Label>
            <div className="flex gap-2">
              <Input
                placeholder="C:\Python311\python.exe"
                value={customPath}
                onChange={(e) => {
                  setCustomPath(e.target.value);
                  setCustomError("");
                }}
                className={cn(customError && "border-destructive")}
              />
              <Button
                onClick={handleValidateCustomPath}
                disabled={!customPath || isValidating}
                className="cursor-pointer"
              >
                {isValidating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {customError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {customError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the full path to your Python executable (python.exe on
              Windows)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
