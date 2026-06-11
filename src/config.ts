import path from "node:path";

export interface AppConfig {
  port: number;
  publicBaseUrl: string;
  voiceDir: string;
  voiceRetentionHours: number;
  audioOrigins: string[];
  allowedOrigins: string[];
  mcpHttpPath: string;
}

export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePublicBaseUrl(port: number, requirePublicBaseUrl: boolean): string {
  const value = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (value) return value;
  if (requirePublicBaseUrl) {
    throw new Error("PUBLIC_BASE_URL is required so MCP widgets can load audio over a public HTTPS URL.");
  }
  return `http://127.0.0.1:${port}`;
}

function normalizePath(value: string | undefined, defaultValue: string): string {
  const path = value?.trim() || defaultValue;
  return path.startsWith("/") ? path : `/${path}`;
}

export function loadConfig(options: { requirePublicBaseUrl?: boolean } = {}): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const normalizedPort = Number.isFinite(port) ? port : 3000;
  const publicBaseUrl = parsePublicBaseUrl(normalizedPort, options.requirePublicBaseUrl ?? false);
  const voiceDir = process.env.VOICE_DIR?.trim() || path.resolve(process.cwd(), "data/voice");
  const voiceRetentionHours = Number.parseInt(process.env.VOICE_RETENTION_HOURS ?? "24", 10);
  const audioOrigins = (process.env.MCP_VOICE_AUDIO_ORIGIN ?? new URL(publicBaseUrl).origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? new URL(publicBaseUrl).origin)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    port: normalizedPort,
    publicBaseUrl,
    voiceDir,
    voiceRetentionHours: Number.isFinite(voiceRetentionHours) ? voiceRetentionHours : 24,
    audioOrigins,
    allowedOrigins,
    mcpHttpPath: normalizePath(process.env.MCP_HTTP_PATH, "/mcp/voice")
  };
}
