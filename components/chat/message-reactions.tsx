"use client";

import { useState, useEffect } from "react";
import { useMessageReactions } from "@/hooks/use-message-reactions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Lightbulb,
  Flame,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  messageId: string;
}

const reactionPresets = [
  {
    type: "helpful",
    icon: ThumbsUp,
    label: "Helpful",
    color: "text-green-500",
  },
  {
    type: "unhelpful",
    icon: ThumbsDown,
    label: "Unhelpful",
    color: "text-red-500",
  },
  {
    type: "bookmark",
    icon: Bookmark,
    label: "Bookmark",
    color: "text-yellow-500",
  },
  { type: "heart", icon: Heart, label: "Love", color: "text-pink-500" },
  {
    type: "lightbulb",
    icon: Lightbulb,
    label: "Insightful",
    color: "text-yellow-400",
  },
  { type: "fire", icon: Flame, label: "Excellent", color: "text-orange-500" },
];

export function MessageReactions({ messageId }: MessageReactionsProps) {
  const { reactions, fetchReactions, addReaction, removeReaction } =
    useMessageReactions(messageId);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const handleReactionClick = async (type: string) => {
    try {
      const existing = reactions.find((r) => r.type === type);
      if (existing) {
        await removeReaction(type);
      } else {
        await addReaction(type);
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const visibleReactions = reactions.filter((r) => r.count > 0).slice(0, 3);
  const hasMore = reactions.length > 3;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Visible Reactions */}
      {visibleReactions.map((reaction) => {
        const preset = reactionPresets.find((p) => p.type === reaction.type);
        if (!preset) return null;

        const Icon = preset.icon;
        const hasReaction = reactions.find((r) => r.type === reaction.type);
        return (
          <Button
            key={reaction.type}
            size="sm"
            onClick={() => handleReactionClick(reaction.type)}
            className={cn(
              "h-auto px-2.5 py-1.5 gap-1.5 text-xs font-medium border transition-all duration-200",
              hasReaction
                ? "bg-primary/10 border-primary/50 text-primary hover:border-primary"
                : "border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50",
            )}
            title={preset.label}
          >
            <Icon className={cn("w-3.5 h-3.5", preset.color)} />
            {reaction.count > 1 && (
              <span className="text-xs font-semibold">{reaction.count}</span>
            )}
          </Button>
        );
      })}

      {/* More Reactions Popover */}
      {hasMore && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              className="h-auto px-2.5 py-1.5 border border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50 transition-all duration-200"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex flex-wrap gap-2">
              {reactionPresets.map((preset) => {
                const Icon = preset.icon;
                const hasReaction = reactions.find(
                  (r) => r.type === preset.type,
                );

                return (
                  <Button
                    key={preset.type}
                    size="sm"
                    onClick={() => {
                      handleReactionClick(preset.type);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "h-auto px-2.5 py-1.5 gap-1.5 border font-medium transition-all duration-200",
                      hasReaction
                        ? "bg-primary/10 border-primary/50 text-primary hover:border-primary"
                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50",
                    )}
                    title={preset.label}
                  >
                    <Icon className={cn("w-4 h-4", preset.color)} />
                    <span className="text-xs">{preset.label}</span>
                    {hasReaction && (
                      <span className="text-xs font-semibold ml-1">
                        ({hasReaction.count})
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Add Reaction Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className="h-auto px-2.5 py-1.5 border border-border/50 text-base hover:border-border hover:bg-secondary/50 transition-all duration-200"
            title="Add reaction"
          >
            <span>😀</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-wrap gap-2">
            {reactionPresets.map((preset) => {
              const Icon = preset.icon;
              const hasReaction = reactions.find((r) => r.type === preset.type);

              return (
                <Button
                  key={preset.type}
                  size="sm"
                  onClick={() => handleReactionClick(preset.type)}
                  className={cn(
                    "h-auto px-2.5 py-1.5 gap-1.5 border font-medium transition-all duration-200",
                    hasReaction
                      ? "bg-primary/10 border-primary/50 text-primary hover:border-primary"
                      : "border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50",
                  )}
                  title={preset.label}
                >
                  <Icon className={cn("w-4 h-4", preset.color)} />
                  <span className="text-xs">{preset.label}</span>
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
