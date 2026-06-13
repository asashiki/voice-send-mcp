/**
 * TTS provider abstraction, modelled after how mature agents (e.g. Hermes)
 * expose TTS: one `TTS_PROVIDER` switch, per-provider env namespaces,
 * documented per-provider input length caps with automatic truncation,
 * and a keyless free default so the project works out of the box.
 */

export interface SynthesisResult {
  audio: Buffer;
  mimeType: string;
  fileExtension: string;
}

export interface TtsProvider {
  readonly name: string;
  /** Documented per-request input cap; text is truncated to this before synthesis. */
  readonly maxTextLength: number;
  /** True when required credentials/config are present. */
  isConfigured(env: NodeJS.ProcessEnv): boolean;
  synthesize(text: string, env: NodeJS.ProcessEnv): Promise<SynthesisResult>;
}

export function numberEnv(env: NodeJS.ProcessEnv, name: string, defaultValue: number): number {
  const value = Number.parseFloat(env[name] ?? "");
  return Number.isFinite(value) ? value : defaultValue;
}

export function truncateForProvider(text: string, provider: TtsProvider, env: NodeJS.ProcessEnv): string {
  const override = Number.parseInt(env.TTS_MAX_TEXT_LENGTH ?? "", 10);
  const cap = Number.isFinite(override) && override > 0 ? override : provider.maxTextLength;
  return text.length > cap ? text.slice(0, cap) : text;
}
