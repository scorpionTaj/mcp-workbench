"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  pluginId: string | null;
  sourceUrl: string | null;
  files: string[];
  instructionsLength: number;
  updatedAt: string;
}

export interface SkillDetail extends Omit<SkillSummary, "files" | "instructionsLength"> {
  instructions: string;
  resources: Record<string, string>;
}

export interface SkillInput {
  name: string;
  description: string;
  instructions: string;
  resources?: Record<string, string>;
  enabled?: boolean;
}

export interface CommandInfo {
  id: string;
  name: string;
  description: string | null;
  argumentHint: string | null;
  prompt: string;
  enabled: boolean;
  pluginId: string | null;
}

export type CommandInput = Pick<CommandInfo, "name" | "description" | "argumentHint" | "prompt">;

export function useSkills() {
  const { data, isLoading, error, mutate } = useSWR<SkillSummary[]>("/api/skills", fetcher, { revalidateOnFocus: false });
  return {
    skills: data ?? [],
    isLoading,
    error,
    mutate,
    getSkill: (id: string) => fetcher<SkillDetail>(`/api/skills/${id}`),
    createSkill: async (input: SkillInput) => {
      await send("/api/skills", "POST", input);
      await mutate();
    },
    updateSkill: async (id: string, input: Partial<SkillInput>) => {
      await send(`/api/skills/${id}`, "PATCH", input);
      await mutate();
    },
    deleteSkill: async (id: string) => {
      await send(`/api/skills/${id}`, "DELETE");
      await mutate();
    },
    importSkills: async (url: string) => {
      const result = await send<{ imported: string[]; errors: string[] }>("/api/skills/import", "POST", { url });
      await mutate();
      return result;
    },
  };
}

export function useCommands() {
  const { data, isLoading, error, mutate } = useSWR<CommandInfo[]>("/api/commands", fetcher, { revalidateOnFocus: false });
  return {
    commands: data ?? [],
    isLoading,
    error,
    mutate,
    createCommand: async (input: CommandInput) => {
      await send("/api/commands", "POST", input);
      await mutate();
    },
    updateCommand: async (id: string, input: Partial<CommandInput> & { enabled?: boolean }) => {
      await send(`/api/commands?id=${encodeURIComponent(id)}`, "PATCH", input);
      await mutate();
    },
    deleteCommand: async (id: string) => {
      await send(`/api/commands?id=${encodeURIComponent(id)}`, "DELETE");
      await mutate();
    },
  };
}
