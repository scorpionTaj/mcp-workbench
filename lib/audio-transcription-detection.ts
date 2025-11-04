/**
 * Audio Transcription Model Detection
 *
 * Detects models that can transcribe audio/speech to text.
 * Includes models like Whisper from OpenAI and other speech-to-text services.
 */

const AUDIO_TRANSCRIPTION_PATTERNS = [
  // OpenAI Whisper models
  /whisper/i,

  // Speech recognition keywords
  /speech-to-text/i,
  /stt/i,
  /transcription/i,
  /asr/i, // Automatic Speech Recognition

  // Other popular models
  /wav2vec/i,
  /conformer/i,
  /speechbrain/i,
  /vosk/i,
  /deepspeech/i,
  /silero/i,

  // Provider-specific
  /google.*speech/i,
  /azure.*speech/i,
  /amazon.*transcribe/i,
];

/**
 * Check if a model name indicates audio transcription capability
 */
export function isAudioTranscriptionModel(modelName: string): boolean {
  const normalized = modelName.toLowerCase().trim();

  // Check against all patterns
  return AUDIO_TRANSCRIPTION_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );
}

/**
 * Get popular audio transcription models by provider
 */
export const KNOWN_AUDIO_MODELS = {
  openai: ["whisper-1"],
  groq: [
    "whisper-large-v3",
    "whisper-large-v3-turbo",
    "distil-whisper-large-v3-en",
  ],
  huggingface: [
    "openai/whisper-large-v3",
    "openai/whisper-large-v3-turbo",
    "openai/whisper-medium",
    "openai/whisper-small",
    "openai/whisper-base",
    "openai/whisper-tiny",
    "distil-whisper/distil-large-v3",
    "facebook/wav2vec2-large-960h",
    "speechbrain/asr-wav2vec2-commonvoice-en",
    "nvidia/canary-1b",
  ],
  replicate: [
    "openai/whisper",
    "vaibhavs10/incredibly-fast-whisper",
    "m1guelpf/whisper-subtitles",
  ],
} as const;

/**
 * Check if a provider supports audio transcription
 */
export function providerSupportsAudioTranscription(provider: string): boolean {
  return ["openai", "groq", "huggingface", "replicate"].includes(provider);
}

/**
 * Get supported audio formats for transcription
 */
export const SUPPORTED_AUDIO_FORMATS = [
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a, .mp4
  "audio/wav", // .wav
  "audio/webm", // .webm
  "audio/ogg", // .ogg
  "audio/flac", // .flac
] as const;

/**
 * Maximum audio file size (25MB for OpenAI Whisper)
 */
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25MB
