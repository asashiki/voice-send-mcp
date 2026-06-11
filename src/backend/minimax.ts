import { numberEnv, type SynthesisResult, type TtsProvider } from "./provider.js";

const DEFAULT_ENDPOINT = "https://api.minimaxi.com/v1/t2a_v2";
const DEFAULT_MODEL = "speech-2.8-hd";
const DEFAULT_FORMAT = "mp3";

export interface MinimaxConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  voiceId: string;
  groupId: string | null;
  speed: number;
  volume: number;
  pitch: number;
  sampleRate: number;
  bitrate: number;
  audioFormat: string;
  channel: number;
}

export function parseMinimaxConfig(env: NodeJS.ProcessEnv): MinimaxConfig | null {
  const apiKey = env.MINIMAX_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    endpoint: env.MINIMAX_API_BASE_URL?.trim() || DEFAULT_ENDPOINT,
    model: env.MINIMAX_MODEL?.trim() || DEFAULT_MODEL,
    voiceId: env.MINIMAX_VOICE_ID?.trim() || "AnnaClone2026new",
    groupId: env.MINIMAX_GROUP_ID?.trim() || null,
    speed: numberEnv(env, "MINIMAX_VOICE_SPEED", 1),
    volume: numberEnv(env, "MINIMAX_VOICE_VOLUME", 1),
    pitch: numberEnv(env, "MINIMAX_VOICE_PITCH", 0),
    sampleRate: numberEnv(env, "MINIMAX_SAMPLE_RATE", 32000),
    bitrate: numberEnv(env, "MINIMAX_BITRATE", 128000),
    audioFormat: env.MINIMAX_AUDIO_FORMAT?.trim() || DEFAULT_FORMAT,
    channel: numberEnv(env, "MINIMAX_CHANNEL", 1)
  };
}

interface MinimaxResponse {
  data?: { audio?: string };
  base_resp?: { status_code?: number; status_msg?: string };
}

export async function synthesizeVoice(config: MinimaxConfig, text: string): Promise<Buffer> {
  if (!text || text.trim().length === 0) throw new Error("text is empty");

  const url = config.groupId
    ? `${config.endpoint}?GroupId=${encodeURIComponent(config.groupId)}`
    : config.endpoint;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      text,
      stream: false,
      voice_setting: {
        voice_id: config.voiceId,
        speed: config.speed,
        vol: config.volume,
        pitch: config.pitch
      },
      audio_setting: {
        sample_rate: config.sampleRate,
        bitrate: config.bitrate,
        format: config.audioFormat,
        channel: config.channel
      }
    })
  });

  if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as MinimaxResponse;
  const status = json.base_resp?.status_code;
  if (status !== undefined && status !== 0) {
    throw new Error(`MiniMax API error ${status}: ${json.base_resp?.status_msg}`);
  }
  const hex = json.data?.audio;
  if (!hex) throw new Error("MiniMax response missing data.audio");
  return Buffer.from(hex, "hex");
}

export const minimaxProvider: TtsProvider = {
  name: "minimax",
  maxTextLength: 10_000,

  isConfigured(env) {
    return parseMinimaxConfig(env) !== null;
  },

  async synthesize(text, env): Promise<SynthesisResult> {
    const config = parseMinimaxConfig(env);
    if (!config) throw new Error("MiniMax is not configured. Set MINIMAX_API_KEY.");
    const audio = await synthesizeVoice(config, text);
    const ext = config.audioFormat === "mp3" ? "mp3" : config.audioFormat;
    return {
      audio,
      mimeType: ext === "mp3" ? "audio/mpeg" : `audio/${ext}`,
      fileExtension: ext
    };
  }
};
