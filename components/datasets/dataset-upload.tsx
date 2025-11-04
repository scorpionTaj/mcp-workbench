"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import logger from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DatasetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/x-parquet": [".parquet"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      alert("Dataset uploaded successfully!");
      setFile(null);
      window.location.reload();
    } catch (error) {
      logger.error({ err: error }, "MCP Workbench Upload error");
      alert("Failed to upload dataset. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-muted-foreground">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-muted-foreground mb-2">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports CSV and Parquet files
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
          <FileText className="w-8 h-8 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full"
      >
        {isUploading ? "Uploading..." : "Upload Dataset"}
      </Button>
    </div>
  );
}
