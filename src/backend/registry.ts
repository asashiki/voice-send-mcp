import { edgeProvider } from "./edge.js";
import { elevenLabsProvider } from "./elevenlabs.js";
import { minimaxProvider } from "./minimax.js";
import { openaiProvider } from "./openai.js";
import type { TtsProvider } from "./provider.js";

export const PROVIDERS: Record<string, TtsProvider> = {
  minimax: minimaxProvider,
  openai: openaiProvider,
  elevenlabs: elevenLabsProvider,
  edge: edgeProvider
};

export const PROVIDER_NAMES = Object.keys(PROVIDERS);

/** Auto-detect order when TTS_PROVIDER is unset/auto: paid keys first, free Edge as fallback. */
const AUTO_ORDER: TtsProvider[] = [minimaxProvider, elevenLabsProvider, openaiProvider, edgeProvider];

export function resolveProvider(env: NodeJS.ProcessEnv): TtsProvider {
  const requested = env.TTS_PROVIDER?.trim().toLowerCase();
  if (requested && requested !== "auto") {
    const provider = PROVIDERS[requested];
    if (!provider) {
      throw new Error(`Unsupported TTS_PROVIDER "${requested}". Supported: ${PROVIDER_NAMES.join(", ")}, auto.`);
    }
    return provider;
  }
  for (const provider of AUTO_ORDER) {
    if (provider.isConfigured(env)) return provider;
  }
  return edgeProvider;
}
