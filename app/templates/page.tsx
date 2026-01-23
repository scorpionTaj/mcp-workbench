"use client";

import { useState } from "react";
import { ChatTemplatesGallery } from "@/components/chat/chat-templates-gallery";
import { CreateTemplateDialog } from "@/components/chat/create-template-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient">
            Chat Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse and create templates to speed up your conversations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          Create Template
        </Button>
      </div>

      {/* Templates Gallery */}
      <ChatTemplatesGallery
        key={refreshKey}
        onTemplateSelect={() => {
          setRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
