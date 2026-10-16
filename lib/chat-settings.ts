import { z } from "zod";

/** Sampling settings sent with each chat request and saved with the chat (in Chat.meta.settings). */
export const chatSettingsSchema = z
  .object({
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    maxOutputTokens: z.number().int().positive().max(1_000_000),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
  })
  .partial();

export type ChatSettings = z.infer<typeof chatSettingsSchema>;

function parseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Returns the chat's meta JSON with `settings` replaced, keeping its other keys (e.g. scheduleId). */
export function withChatSettings(meta: string | null, settings: ChatSettings): string {
  return JSON.stringify({ ...parseMeta(meta), settings });
}

/** The settings saved in a chat's meta, or null when there are none or they are invalid. */
export function savedChatSettings(meta: unknown): ChatSettings | null {
  const raw = typeof meta === "string" ? parseMeta(meta) : meta;
  if (!raw || typeof raw !== "object" || !("settings" in raw)) return null;
  const result = chatSettingsSchema.safeParse((raw as { settings: unknown }).settings);
  return result.success ? result.data : null;
}
