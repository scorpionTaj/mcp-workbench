import { NextResponse } from "next/server";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getModel, ProviderError } from "@/lib/models";
import { buildJudgePrompt, JUDGE_SYSTEM, judgeVerdictSchema, parseJudgeResponse } from "@/lib/compare-judge";
import { MAX_PROMPT_CHARS } from "@/lib/compare-batch";
import logger from "@/lib/logger";

export const maxDuration = 120;

const bodySchema = z.object({
  provider: z.string().min(1).max(50),
  modelId: z.string().min(1).max(200),
  rubric: z.string().max(5_000),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  answer: z.string().min(1).max(100_000),
});

/**
 * Scores one answer 1–10 with a short rationale. Asks the judge for structured output; when a
 * model can't produce it, the raw text is parsed and validated against the same schema.
 */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;
  let model;
  try {
    model = await getModel(user, data.provider, data.modelId);
  } catch (err) {
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  try {
    const result = await generateText({
      model,
      system: JUDGE_SYSTEM,
      prompt: buildJudgePrompt(data),
      output: Output.object({ schema: judgeVerdictSchema, name: "verdict" }),
      temperature: 0,
      abortSignal: req.signal,
    });
    return NextResponse.json(result.output);
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      try {
        return NextResponse.json(parseJudgeResponse(err.text));
      } catch (parseErr) {
        return NextResponse.json({ error: (parseErr as Error).message }, { status: 502 });
      }
    }
    logger.error({ err, provider: data.provider }, "Compare judge failed");
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "The judge request failed",
      },
      { status: 502 },
    );
  }
}, { rateLimit: "compareBatch" });
