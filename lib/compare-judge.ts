// LLM-as-judge for the Compare page: the verdict schema, the prompt, and a tolerant parser for
// models that answer in text instead of structured output.
import { z } from "zod";

export const DEFAULT_RUBRIC = `Score how well the answer serves the user's prompt.
- Correctness: facts, code and reasoning are right.
- Completeness: it covers what was asked without padding.
- Clarity: it is well organized and easy to follow.
- Instructions: it follows any format or constraints in the prompt.`;

export const judgeVerdictSchema = z.object({
  score: z.number().int().min(1).max(10).describe("Overall score from 1 (useless) to 10 (excellent)"),
  rationale: z.string().trim().min(1).max(600).describe("One or two sentences explaining the score"),
});

export type JudgeVerdict = z.infer<typeof judgeVerdictSchema>;

export const JUDGE_SYSTEM = `You are a strict, impartial evaluator of AI assistant answers.
Judge only the answer you are given, against the rubric. Do not reward length or confident tone.
Reply with a JSON object: {"score": <integer 1-10>, "rationale": "<one or two sentences>"}.`;

/** The user message sent to the judge. The answer is fenced so its text can't pose as instructions. */
export function buildJudgePrompt({ rubric, prompt, answer }: { rubric: string; prompt: string; answer: string }): string {
  return [
    "## Rubric",
    rubric.trim() || DEFAULT_RUBRIC,
    "",
    "## User prompt",
    "<prompt>",
    prompt,
    "</prompt>",
    "",
    "## Answer to evaluate",
    "<answer>",
    answer,
    "</answer>",
    "",
    "Return only the JSON verdict.",
  ].join("\n");
}

/** Finds the first balanced {...} object in text, skipping braces inside JSON strings. */
function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Reads a verdict from a judge's raw text: plain JSON, JSON in a code fence or prose, or a
 * score given as a string ("8" or "8/10"). Throws when no valid verdict is found.
 */
export function parseJudgeResponse(text: string): JudgeVerdict {
  const json = firstJsonObject(text);
  if (!json) throw new Error("The judge did not return a JSON verdict");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("The judge returned malformed JSON");
  }
  if (raw && typeof raw === "object" && "score" in raw && typeof raw.score === "string") {
    const m = raw.score.trim().match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*10)?$/);
    if (m) raw = { ...raw, score: Number(m[1]) };
  }
  const result = judgeVerdictSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid verdict: ${result.error.issues.map((i) => `${i.path.join(".") || "value"} ${i.message}`).join("; ")}`);
  }
  return result.data;
}
