import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getModel, ProviderError } from "@/lib/models";
import { MAX_PROMPT_CHARS } from "@/lib/compare-batch";
import logger from "@/lib/logger";

export const maxDuration = 300;

const bodySchema = z.object({
  provider: z.string().min(1).max(50),
  modelId: z.string().min(1).max(200),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  system: z.string().max(20_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * One prompt, one model, one complete answer: the unit of a Compare batch run. The client runs
 * several at once with its own concurrency limit. Nothing is stored.
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

  const started = Date.now();
  try {
    const result = await generateText({
      model,
      system: data.system || undefined,
      prompt: data.prompt,
      abortSignal: req.signal,
      ...(data.temperature !== undefined && { temperature: data.temperature }),
    });
    return NextResponse.json({
      text: result.text,
      inputTokens: result.totalUsage.inputTokens ?? null,
      outputTokens: result.totalUsage.outputTokens ?? null,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    logger.error({ err, provider: data.provider }, "Compare batch run failed");
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "The model request failed",
      },
      { status: 502 },
    );
  }
}, { rateLimit: "compareBatch" });
