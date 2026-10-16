import { NextResponse } from "next/server";
import { transcribe } from "ai";
import { withUser } from "@/lib/api";
import { getTranscriptionModel } from "@/lib/models";
import { recordGeneration, studioError, STUDIO_LIMITS } from "@/lib/studio";

export const maxDuration = 300;

/** Multipart: `file` (audio), `provider`, `modelId`. The audio itself is not stored. */
export const POST = withUser(async (req, user) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const provider = String(form?.get("provider") ?? "");
  const modelId = String(form?.get("modelId") ?? "");
  if (!(file instanceof File) || !provider || !modelId) {
    return NextResponse.json({ error: "Send an audio file with a provider and model" }, { status: 400 });
  }
  if (file.size > STUDIO_LIMITS.audioBytes) return NextResponse.json({ error: "Audio files can be at most 25 MB" }, { status: 400 });
  if (!/^(audio|video)\//.test(file.type) && !/\.(mp3|mp4|m4a|wav|webm|ogg|oga|flac|mpeg|mpga)$/i.test(file.name)) {
    return NextResponse.json({ error: "That doesn't look like an audio file" }, { status: 400 });
  }
  const started = Date.now();
  try {
    const result = await transcribe({
      model: await getTranscriptionModel(user.id, provider, modelId),
      audio: new Uint8Array(await file.arrayBuffer()),
      maxRetries: 1,
    });
    const row = await recordGeneration({
      userId: user.id,
      kind: "transcription",
      provider,
      modelId,
      prompt: file.name.slice(0, 300),
      text: result.text,
      settings: { language: result.language, durationInSeconds: result.durationInSeconds },
      durationMs: Date.now() - started,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return studioError(err, "Transcription");
  }
}, { rateLimit: "studio" });
