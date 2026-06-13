import { numberEnv, type SynthesisResult, type TtsProvider } from "./provider.js";

/**
 * OpenAI TTS — also covers any OpenAI-compatible /audio/speech endpoint
 * via OPENAI_TTS_BASE_URL (the same trick Hermes uses with `base_url`).
 */
export const openaiProvider: TtsProvider = {
  name: "openai",
  maxTextLength: 4096,

  isConfigured(env) {
    return Boolean(env.OPENAI_API_KEY?.trim());
  },

  async synthesize(text, env): Promise<SynthesisResult> {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OpenAI TTS is not configured. Set OPENAI_API_KEY.");
    const baseUrl = (env.OPENAI_TTS_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
    const voice = env.OPENAI_TTS_VOICE?.trim() || "alloy";
    const speed = numberEnv(env, "OPENAI_TTS_SPEED", 1);

    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, voice, input: text, speed, response_format: "mp3" })
    });
    if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return {
      audio: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
      fileExtension: "mp3"
    };
  }
};
