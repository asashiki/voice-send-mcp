import type { SynthesisResult, TtsProvider } from "./provider.js";

/**
 * Microsoft Edge TTS — free, no API key, 300+ neural voices.
 * Great for zero-config trials. Note: Microsoft sometimes blocks
 * datacenter IPs (WebSocket 403); if that happens on your VPS,
 * switch to minimax / openai / elevenlabs.
 */
export const edgeProvider: TtsProvider = {
  name: "edge",
  maxTextLength: 5000,

  isConfigured() {
    return true;
  },

  async synthesize(text, env): Promise<SynthesisResult> {
    const { EdgeTTS } = await import("@andresaya/edge-tts");
    const voice = env.EDGE_TTS_VOICE?.trim() || "zh-CN-XiaoxiaoNeural";
    const rate = env.EDGE_TTS_RATE?.trim() || "0%"; // e.g. "+10%"
    const pitch = env.EDGE_TTS_PITCH?.trim() || "0Hz"; // e.g. "+2Hz"
    const volume = env.EDGE_TTS_VOLUME?.trim() || "0%";

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, { rate, pitch, volume });
    const audio = tts.toBuffer();
    if (!audio || audio.length === 0) throw new Error("Edge TTS returned empty audio.");
    return { audio: Buffer.from(audio), mimeType: "audio/mpeg", fileExtension: "mp3" };
  }
};
