import { db } from "@/lib/db";
import { chatTemplates } from "@/lib/schema";
import { eq, ilike, desc, and, or, isNull, sql } from "drizzle-orm";

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

// A user sees built-in templates (no owner), their own, and ones others shared publicly.
const visibleTo = (userId: string) =>
  or(isNull(chatTemplates.userId), eq(chatTemplates.userId, userId), eq(chatTemplates.isPublic, true));

const ownedBy = (userId: string, id: string) =>
  and(eq(chatTemplates.id, id), eq(chatTemplates.userId, userId));

const json = (v: unknown) => (v ? JSON.stringify(v) : null);

export async function createTemplate(userId: string, input: CreateTemplateInput) {
  try {
    const [data] = await db
      .insert(chatTemplates)
      .values({
        userId,
        name: input.name,
        description: input.description,
        category: input.category,
        systemPrompt: input.systemPrompt,
        suggestedTools: json(input.suggestedTools),
        suggestedModel: input.suggestedModel,
        modelParams: json(input.modelParams),
        sampleMessages: json(input.sampleMessages),
        tags: json(input.tags),
        isPublic: input.isPublic ?? false,
        author: input.author,
      })
      .returning();
    return { success: true, data };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

export async function getTemplates(
  userId: string,
  filters?: { category?: string; isPublic?: boolean; search?: string; limit?: number; offset?: number },
) {
  try {
    const conditions = [visibleTo(userId)];
    if (filters?.category) conditions.push(eq(chatTemplates.category, filters.category));
    if (filters?.isPublic !== undefined) conditions.push(eq(chatTemplates.isPublic, filters.isPublic));
    if (filters?.search) {
      conditions.push(ilike(chatTemplates.name, `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`));
    }

    const data = await db
      .select()
      .from(chatTemplates)
      .where(and(...conditions))
      .orderBy(desc(chatTemplates.createdAt))
      .limit(Math.min(filters?.limit ?? 100, 100))
      .offset(filters?.offset ?? 0);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return { success: false, error: "Failed to fetch templates" };
  }
}

export async function getTemplateById(userId: string, id: string) {
  try {
    const [data] = await db
      .select()
      .from(chatTemplates)
      .where(and(eq(chatTemplates.id, id), visibleTo(userId)));
    if (!data) return { success: false, error: "Template not found" };
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

export async function updateTemplate(userId: string, input: UpdateTemplateInput) {
  try {
    const [data] = await db
      .update(chatTemplates)
      .set({
        updatedAt: new Date(),
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.systemPrompt && { systemPrompt: input.systemPrompt }),
        ...(input.suggestedTools && { suggestedTools: json(input.suggestedTools) }),
        ...(input.suggestedModel && { suggestedModel: input.suggestedModel }),
        ...(input.modelParams && { modelParams: json(input.modelParams) }),
        ...(input.sampleMessages && { sampleMessages: json(input.sampleMessages) }),
        ...(input.tags && { tags: json(input.tags) }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      })
      .where(ownedBy(userId, input.id))
      .returning();
    if (!data) return { success: false, error: "Template not found" };
    return { success: true, data };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteTemplate(userId: string, id: string) {
  try {
    const deleted = await db.delete(chatTemplates).where(ownedBy(userId, id)).returning();
    if (!deleted.length) return { success: false, error: "Template not found" };
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function incrementTemplateUsage(userId: string, id: string) {
  try {
    const [data] = await db
      .update(chatTemplates)
      .set({ usageCount: sql`${chatTemplates.usageCount} + 1` })
      .where(and(eq(chatTemplates.id, id), visibleTo(userId)))
      .returning();
    if (!data) return { success: false, error: "Template not found" };
    return { success: true, data };
  } catch (error) {
    console.error("Failed to increment usage count:", error);
    return { success: false, error: "Failed to increment usage count" };
  }
}

export async function getPopularTemplates(userId: string, limit: number = 10) {
  try {
    const data = await db
      .select()
      .from(chatTemplates)
      .where(visibleTo(userId))
      .orderBy(desc(chatTemplates.usageCount))
      .limit(Math.min(limit, 50));
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch popular templates:", error);
    return { success: false, error: "Failed to fetch popular templates" };
  }
}
