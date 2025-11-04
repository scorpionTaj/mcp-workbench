"use client";

import React from "react";
import logger from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error({ err: error, errorInfo }, "[Error Boundary] Caught error");
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full p-8 border-destructive/50 bg-linear-to-br from-destructive/5 to-destructive/10">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground mb-4">
                  {this.state.error?.message ||
                    "An unexpected error occurred. Please try refreshing the page."}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
