"use server";

import { db } from "@/lib/drizzle-db";
import { messageReactions, messageAnnotations } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ========== REACTIONS ==========

export async function addMessageReaction(
  messageId: string,
  type: string,
  emoji?: string,
) {
  try {
    // Check if reaction already exists
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.type, type),
        ),
      );

    if (existing.length > 0) {
      // Increment count if exists
      const result = await db
        .update(messageReactions)
        .set({
          count: existing[0].count + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageReactions.id, existing[0].id))
        .returning();
      return { success: true, data: result[0] };
    }

    // Create new reaction
    const result = await db
      .insert(messageReactions)
      .values({
        id: createId(),
        messageId,
        type,
        emoji,
        count: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to add reaction:", error);
    return { success: false, error: "Failed to add reaction" };
  }
}

export async function removeMessageReaction(messageId: string, type: string) {
  try {
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.type, type),
        ),
      );

    if (existing.length === 0) {
      return { success: false, error: "Reaction not found" };
    }

    if (existing[0].count > 1) {
      const result = await db
        .update(messageReactions)
        .set({
          count: existing[0].count - 1,
          updatedAt: new Date(),
        })
        .where(eq(messageReactions.id, existing[0].id))
        .returning();
      return { success: true, data: result[0] };
    }

    // Delete if count reaches 0
    await db
      .delete(messageReactions)
      .where(eq(messageReactions.id, existing[0].id));
    return { success: true };
  } catch (error) {
    console.error("Failed to remove reaction:", error);
    return { success: false, error: "Failed to remove reaction" };
  }
}

export async function getMessageReactions(messageId: string) {
  try {
    const reactions = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    return { success: true, data: reactions };
  } catch (error) {
    console.error("Failed to fetch reactions:", error);
    return { success: false, error: "Failed to fetch reactions" };
  }
}

// ========== ANNOTATIONS ==========

export async function createMessageAnnotation(
  messageId: string,
  type: string,
  content?: string,
  options?: {
    color?: string;
    position?: number;
    length?: number;
  },
) {
  try {
    const result = await db
      .insert(messageAnnotations)
      .values({
        id: createId(),
        messageId,
        type,
        content,
        color: options?.color || "yellow",
        position: options?.position,
        length: options?.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to create annotation:", error);
    return { success: false, error: "Failed to create annotation" };
  }
}

export async function updateMessageAnnotation(
  annotationId: string,
  updates: {
    content?: string;
    color?: string;
    type?: string;
  },
) {
  try {
    const updateData: any = { updatedAt: new Date() };

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.type !== undefined) updateData.type = updates.type;

    const result = await db
      .update(messageAnnotations)
      .set(updateData)
      .where(eq(messageAnnotations.id, annotationId))
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to update annotation:", error);
    return { success: false, error: "Failed to update annotation" };
  }
}

export async function deleteMessageAnnotation(annotationId: string) {
  try {
    await db
      .delete(messageAnnotations)
      .where(eq(messageAnnotations.id, annotationId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete annotation:", error);
    return { success: false, error: "Failed to delete annotation" };
  }
}

export async function getMessageAnnotations(messageId: string) {
  try {
    const annotations = await db
      .select()
      .from(messageAnnotations)
      .where(eq(messageAnnotations.messageId, messageId));

    return { success: true, data: annotations };
  } catch (error) {
    console.error("Failed to fetch annotations:", error);
    return { success: false, error: "Failed to fetch annotations" };
  }
}

// Get all metadata for a message (reactions + annotations)
export async function getMessageMetadata(messageId: string) {
  try {
    const [reactionsRes, annotationsRes] = await Promise.all([
      getMessageReactions(messageId),
      getMessageAnnotations(messageId),
    ]);

    return {
      success: true,
      data: {
        reactions: reactionsRes.success ? reactionsRes.data : [],
        annotations: annotationsRes.success ? annotationsRes.data : [],
      },
    };
  } catch (error) {
    console.error("Failed to fetch message metadata:", error);
    return { success: false, error: "Failed to fetch metadata" };
  }
}
