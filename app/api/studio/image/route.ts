import { NextResponse } from "next/server";
import { generateImage } from "ai";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getImageModel, resolveProviderAccess } from "@/lib/models";
import { generateReplicateImages } from "@/lib/replicate";
import { saveGeneratedFile } from "@/lib/uploads";
import { recordGeneration, studioError, STUDIO_LIMITS } from "@/lib/studio";
import type { KeyUser } from "@/lib/server-keys";

export const maxDuration = 300;

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(
    req,
    z.object({
      provider: z.string().min(1).max(50),
      modelId: z.string().min(1).max(200),
      prompt: z.string().trim().min(1).max(STUDIO_LIMITS.promptChars),
      n: z.number().int().min(1).max(STUDIO_LIMITS.images).default(1),
      size: z.string().regex(/^\d{2,4}x\d{2,4}$/).optional(),
      aspectRatio: z.string().regex(/^\d{1,2}:\d{1,2}$/).optional(),
      seed: z.number().int().min(0).max(2 ** 31 - 1).optional(),
    }),
  );
  if (error) return error;
  const started = Date.now();
  try {
    const { images, warnings } =
      data.provider === "replicate"
        ? await replicateImages(user, data)
        : await generateImage({
            model: await getImageModel(user, data.provider, data.modelId),
            prompt: data.prompt,
            n: data.n,
            ...(data.size && { size: data.size as `${number}x${number}` }),
            ...(data.aspectRatio && { aspectRatio: data.aspectRatio as `${number}:${number}` }),
            ...(data.seed !== undefined && { seed: data.seed }),
            maxRetries: 1,
          });
    const files = await Promise.all(images.map((img) => saveGeneratedFile(user.id, img.uint8Array, img.mediaType)));
    const row = await recordGeneration({
      userId: user.id,
      kind: "image",
      provider: data.provider,
      modelId: data.modelId,
      prompt: data.prompt,
      files,
      settings: { n: data.n, size: data.size, aspectRatio: data.aspectRatio, seed: data.seed },
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ ...row, warnings: warnings.map((w) => ("message" in w ? w.message : w.type)) }, { status: 201 });
  } catch (err) {
    return studioError(err, "Image generation");
  }
}, { rateLimit: "studio" });

// Replicate has no AI SDK image model; lib/replicate.ts runs the predictions.
async function replicateImages(
  user: KeyUser,
  data: { modelId: string; prompt: string; n: number; size?: string; aspectRatio?: string; seed?: number },
) {
  const { apiKey, baseURL } = await resolveProviderAccess(user, "replicate");
  const images = await generateReplicateImages(baseURL, apiKey!, data.modelId, data);
  return { images, warnings: [] as { type: string; message?: string }[] };
}
