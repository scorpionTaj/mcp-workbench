"use client";

import { useState, useEffect } from "react";
import { useMessageReactions } from "@/hooks/use-message-reactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Flag,
  Highlighter,
  MessageSquareText,
  Trash2,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageAnnotationsProps {
  messageId: string;
  content?: string;
}

const annotationTypes = [
  {
    type: "highlight",
    label: "Highlight",
    icon: Highlighter,
    colors: ["yellow", "green", "blue", "pink", "purple"],
  },
  {
    type: "note",
    label: "Note",
    icon: MessageSquareText,
    color: "amber",
  },
  {
    type: "flag",
    label: "Flag",
    icon: Flag,
    color: "red",
  },
  {
    type: "important",
    label: "Important",
    icon: AlertCircle,
    color: "orange",
  },
];

const colorMap: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  green: "bg-green-100 text-green-800 border-green-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  pink: "bg-pink-100 text-pink-800 border-pink-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  red: "bg-red-100 text-red-800 border-red-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
};

export function MessageAnnotations({
  messageId,
  content,
}: MessageAnnotationsProps) {
  const {
    annotations,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useMessageReactions(messageId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("note");
  const [annotationContent, setAnnotationContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const handleCreateAnnotation = async () => {
    if (!annotationContent.trim()) return;

    try {
      await createAnnotation(selectedType, annotationContent, {
        color: selectedColor,
      });
      setAnnotationContent("");
      setSelectedType("note");
      setSelectedColor("yellow");
    } catch (error) {
      console.error("Failed to create annotation:", error);
    }
  };

  const handleUpdateAnnotation = async (id: string) => {
    if (!annotationContent.trim()) return;

    try {
      await updateAnnotation(id, {
        content: annotationContent,
        color: selectedColor,
      });
      setEditingId(null);
      setAnnotationContent("");
      setSelectedColor("yellow");
    } catch (error) {
      console.error("Failed to update annotation:", error);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotation(id);
    } catch (error) {
      console.error("Failed to delete annotation:", error);
    }
  };

  const startEdit = (annotation: any) => {
    setEditingId(annotation.id);
    setAnnotationContent(annotation.content);
    setSelectedColor(annotation.color || "yellow");
    setSelectedType(annotation.type);
  };

  const displayAnnotations = annotations.filter((a) => a.content);

  return (
    <div className="space-y-2">
      {/* Inline Annotation Display */}
      {displayAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className={cn(
            "p-2 rounded border text-sm flex items-start justify-between gap-2",
            colorMap[annotation.color] || colorMap.yellow,
          )}
        >
          <div className="flex-1">
            <div className="font-medium capitalize">{annotation.type}</div>
            <div className="text-xs opacity-75 mt-1">{annotation.content}</div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEdit(annotation)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteAnnotation(annotation.id)}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add/Edit Annotation Dialog */}
      <Dialog open={isOpen || editingId !== null} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setEditingId(null);
              setAnnotationContent("");
              setSelectedType("note");
              setSelectedColor("yellow");
              setIsOpen(true);
            }}
          >
            Add Annotation
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Annotation" : "Add Annotation"}
            </DialogTitle>
            <DialogDescription>
              Add a note, highlight, or flag to this message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {annotationTypes.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Selection (if applicable) */}
            {selectedType === "highlight" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {annotationTypes
                    .find((t) => t.type === "highlight")
                    ?.colors?.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-8 h-8 rounded border-2 transition-all",
                          colorMap[color],
                          selectedColor === color ? "ring-2 ring-offset-2" : "",
                        )}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Content Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder={`Add a ${selectedType}...`}
                value={annotationContent}
                onChange={(e) => setAnnotationContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setEditingId(null);
                  setAnnotationContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingId) {
                    handleUpdateAnnotation(editingId);
                  } else {
                    handleCreateAnnotation();
                  }
                  setIsOpen(false);
                }}
                disabled={!annotationContent.trim()}
              >
                {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
