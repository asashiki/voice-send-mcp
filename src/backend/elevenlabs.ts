import type { SynthesisResult, TtsProvider } from "./provider.js";

export const elevenLabsProvider: TtsProvider = {
  name: "elevenlabs",
  maxTextLength: 10_000,

  isConfigured(env) {
    return Boolean(env.ELEVENLABS_API_KEY?.trim());
  },

  async synthesize(text, env): Promise<SynthesisResult> {
    const apiKey = env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) throw new Error("ElevenLabs is not configured. Set ELEVENLABS_API_KEY.");
    const voiceId = env.ELEVENLABS_VOICE_ID?.trim() || "pNInz6obpgDQGcFmaJgB";
    const modelId = env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, model_id: modelId })
      }
    );
    if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return {
      audio: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
      fileExtension: "mp3"
    };
  }
};
