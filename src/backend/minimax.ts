const DEFAULT_ENDPOINT = "https://api.minimaxi.com/v1/t2a_v2";
const DEFAULT_MODEL = "speech-2.8-hd";
const DEFAULT_FORMAT = "mp3";

export interface MinimaxConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  sampleRate: number;
  bitrate: number;
  audioFormat: string;
  channel: number;
}

function numberEnv(env: NodeJS.ProcessEnv, name: string, defaultValue: number): number {
  const value = Number.parseFloat(env[name] ?? "");
  return Number.isFinite(value) ? value : defaultValue;
}

export function parseMinimaxConfig(env: NodeJS.ProcessEnv): MinimaxConfig | null {
  const apiKey = env.MINIMAX_API_KEY?.trim();
  const endpoint = env.MINIMAX_API_BASE_URL?.trim() || DEFAULT_ENDPOINT;
  const model = env.MINIMAX_MODEL?.trim() || DEFAULT_MODEL;
  const voiceId = env.MINIMAX_VOICE_ID?.trim() || "AnnaClone2026new";
  if (!apiKey) return null;
  return {
    apiKey,
    endpoint,
    model,
    voiceId,
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
  if (text.length > 5000) throw new Error("text too long (max 5000 chars)");

  const res = await fetch(config.endpoint, {
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
