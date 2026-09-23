import type { AggregationLogger } from "@repo/api/automation";

type Meta = Record<string, unknown> | undefined;

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function write(level: string, message: string, meta?: Meta): void {
  const line = safeStringify({
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ?? {}),
  });

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger: AggregationLogger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};
