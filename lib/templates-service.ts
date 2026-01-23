"use server";

import { db } from "@/lib/drizzle-db";
import { chatTemplates } from "@/lib/schema";
import { eq, ilike, desc, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  systemPrompt: string;
  suggestedTools?: string[];
  suggestedModel?: string;
  modelParams?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  sampleMessages?: string[];
  tags?: string[];
  isPublic?: boolean;
  author?: string;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

// Create a new template
export async function createTemplate(input: CreateTemplateInput) {
  try {
    const result = await db
      .insert(chatTemplates)
      .values({
        id: createId(),
        name: input.name,
        description: input.description,
        category: input.category,
        systemPrompt: input.systemPrompt,
        suggestedTools: input.suggestedTools
          ? JSON.stringify(input.suggestedTools)
          : null,
        suggestedModel: input.suggestedModel,
        modelParams: input.modelParams
          ? JSON.stringify(input.modelParams)
          : null,
        sampleMessages: input.sampleMessages
          ? JSON.stringify(input.sampleMessages)
          : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        isPublic: input.isPublic ?? false,
        author: input.author,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

// Get all templates (with filtering)
export async function getTemplates(filters?: {
  category?: string;
  isPublic?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = db.select().from(chatTemplates);

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(chatTemplates.category, filters.category));
    }

    if (filters?.isPublic !== undefined) {
      conditions.push(eq(chatTemplates.isPublic, filters.isPublic));
    }

    if (filters?.search) {
      conditions.push(ilike(chatTemplates.name, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(chatTemplates.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const results = await query;
    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return { success: false, error: "Failed to fetch templates" };
  }
}

// Get template by ID
export async function getTemplateById(id: string) {
  try {
    const result = await db
      .select()
      .from(chatTemplates)
      .where(eq(chatTemplates.id, id));

    if (result.length === 0) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

// Update template
export async function updateTemplate(input: UpdateTemplateInput) {
  try {
    const updates: any = {
      updatedAt: new Date(),
    };

    if (input.name) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.category) updates.category = input.category;
    if (input.systemPrompt) updates.systemPrompt = input.systemPrompt;
    if (input.suggestedTools)
      updates.suggestedTools = JSON.stringify(input.suggestedTools);
    if (input.suggestedModel) updates.suggestedModel = input.suggestedModel;
    if (input.modelParams)
      updates.modelParams = JSON.stringify(input.modelParams);
    if (input.sampleMessages)
      updates.sampleMessages = JSON.stringify(input.sampleMessages);
    if (input.tags) updates.tags = JSON.stringify(input.tags);
    if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

    const result = await db
      .update(chatTemplates)
      .set(updates)
      .where(eq(chatTemplates.id, input.id))
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

// Delete template
export async function deleteTemplate(id: string) {
  try {
    await db.delete(chatTemplates).where(eq(chatTemplates.id, id));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

// Increment usage count
export async function incrementTemplateUsage(id: string) {
  try {
    const template = await db
      .select()
      .from(chatTemplates)
      .where(eq(chatTemplates.id, id));

    if (template.length === 0) {
      return { success: false, error: "Template not found" };
    }

    const newCount = (template[0].usageCount || 0) + 1;

    const result = await db
      .update(chatTemplates)
      .set({ usageCount: newCount, updatedAt: new Date() })
      .where(eq(chatTemplates.id, id))
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to increment usage count:", error);
    return { success: false, error: "Failed to increment usage count" };
  }
}

// Get popular templates
export async function getPopularTemplates(limit: number = 10) {
  try {
    const results = await db
      .select()
      .from(chatTemplates)
      .where(eq(chatTemplates.isPublic, true))
      .orderBy(desc(chatTemplates.usageCount))
      .limit(limit);

    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to fetch popular templates:", error);
    return { success: false, error: "Failed to fetch popular templates" };
  }
}
