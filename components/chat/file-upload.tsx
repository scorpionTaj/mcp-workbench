"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface FileUploadProps {
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  documents: ["application/pdf", "text/plain", "text/markdown"],
};

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSize = MAX_FILE_SIZE_MB,
  accept = "image/*,application/pdf,text/*",
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (type: string) => ALLOWED_TYPES.images.includes(type);
  const isPDF = (type: string) => type === "application/pdf";

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File ${file.name} exceeds ${maxSize}MB limit`;
    }

    // Check file type
    const allAllowedTypes = [
      ...ALLOWED_TYPES.images,
      ...ALLOWED_TYPES.documents,
    ];
    if (!allAllowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    return null;
  };

  const processFiles = async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      const newFiles: AttachedFile[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const error = validateFile(file);

        if (error) {
          alert(error);
          continue;
        }

        // Create FormData for upload
        const formData = new FormData();
        formData.append("file", file);

        // Upload file
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();

        // Create preview for images
        let preview: string | undefined;
        if (isImage(file.type)) {
          preview = URL.createObjectURL(file);
        }

        newFiles.push({
          id: data.id || crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: data.url,
          preview,
        });
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }

    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (isImage(type)) return <ImageIcon className="h-4 w-4" />;
    if (isPDF(type)) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div
        className={cn(
          "relative",
          dragActive && "ring-2 ring-primary rounded-lg"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || files.length >= maxFiles}
          className="w-full h-9"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Paperclip className="h-4 w-4 mr-2" />
              Attach Files ({files.length}/{maxFiles})
            </>
          )}
        </Button>

        {dragActive && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium text-primary">Drop files here</p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card
              key={file.id}
              className="p-3 flex items-center gap-3 group hover:border-primary/50 transition-colors"
            >
              {/* Preview or Icon */}
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded border border-border"
                />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border border-border">
                  {getFileIcon(file.type)}
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Supported: Images (JPEG, PNG, GIF, WebP), PDFs, Text files • Max{" "}
        {maxSize}MB per file
      </p>
    </div>
  );
}
