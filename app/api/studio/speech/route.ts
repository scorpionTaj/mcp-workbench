import { NextResponse } from "next/server";
import { generateSpeech } from "ai";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getSpeechModel } from "@/lib/models";
import { saveGeneratedFile } from "@/lib/uploads";
import { recordGeneration, studioError, STUDIO_LIMITS } from "@/lib/studio";

export const maxDuration = 300;

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(
    req,
    z.object({
      provider: z.string().min(1).max(50),
      modelId: z.string().min(1).max(200),
      text: z.string().trim().min(1).max(STUDIO_LIMITS.speechChars),
      voice: z.string().max(60).optional(),
      speed: z.number().min(0.25).max(4).optional(),
      instructions: z.string().max(1000).optional(),
    }),
  );
  if (error) return error;
  const started = Date.now();
  try {
    const { audio } = await generateSpeech({
      model: await getSpeechModel(user.id, data.provider, data.modelId),
      text: data.text,
      ...(data.voice && { voice: data.voice }),
      ...(data.speed && { speed: data.speed }),
      ...(data.instructions && { instructions: data.instructions }),
      outputFormat: "mp3",
      maxRetries: 1,
    });
    const url = await saveGeneratedFile(user.id, audio.uint8Array, audio.mediaType || "audio/mpeg");
    const row = await recordGeneration({
      userId: user.id,
      kind: "speech",
      provider: data.provider,
      modelId: data.modelId,
      prompt: data.text,
      files: [url],
      settings: { voice: data.voice, speed: data.speed },
      durationMs: Date.now() - started,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return studioError(err, "Speech");
  }
});
