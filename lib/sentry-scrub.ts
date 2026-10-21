type EventRecord = Record<string, unknown>;

function record(value: unknown): EventRecord | undefined {
  return value && typeof value === "object"
    ? (value as EventRecord)
    : undefined;
}

function scrubException(value: unknown): EventRecord | undefined {
  const exception = record(value);
  if (!Array.isArray(exception?.values)) return;

  const values = exception.values.flatMap((value) => {
    const stacktrace = record(record(value)?.stacktrace);
    const frames = Array.isArray(stacktrace?.frames)
      ? stacktrace.frames.flatMap((value) => {
          const frame = record(value);
          if (!frame) return [];

          const clean: EventRecord = {};
          if (typeof frame.filename === "string") {
            clean.filename = frame.filename.split(/[?#]/, 1)[0];
          }
          if (typeof frame.function === "string") clean.function = frame.function;
          if (typeof frame.lineno === "number") clean.lineno = frame.lineno;
          if (typeof frame.colno === "number") clean.colno = frame.colno;
          if (typeof frame.in_app === "boolean") clean.in_app = frame.in_app;
          return [clean];
        })
      : [];

    return [
      {
        type: "Error",
        value: "Error",
        ...(frames.length ? { stacktrace: { frames } } : {}),
      },
    ];
  });

  return { values };
}

/** Keep stack locations while dropping fields that can contain chat or secret data. */
export function scrubSentryEvent<T extends object>(event: T): T {
  const source = event as EventRecord;
  const safe: EventRecord = {};

  for (const key of [
    "event_id",
    "timestamp",
    "level",
    "platform",
    "environment",
    "release",
    "dist",
  ]) {
    if (source[key] !== undefined) safe[key] = source[key];
  }

  const exception = scrubException(source.exception);
  if (exception) safe.exception = exception;

  return safe as T;
}
