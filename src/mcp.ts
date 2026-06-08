import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseMinimaxConfig, synthesizeVoice } from "./backend/minimax.js";
import type { AppConfig } from "./config.js";
import { voiceSendInputSchema, voiceSendResultSchema, type VoiceSendResult } from "./schemas.js";
import { VOICE_BUBBLE_MIME, VOICE_BUBBLE_URI, voiceBubbleHtml } from "./widget/voice-bubble-html.js";

function voiceCspMeta(config: AppConfig) {
  return {
    ui: {
      csp: {
        resourceDomains: config.audioOrigins,
        connectDomains: config.audioOrigins
      }
    },
    "openai/widgetCSP": {
      resource_domains: config.audioOrigins,
      connect_domains: config.audioOrigins
    }
  };
}

async function createVoice(config: AppConfig, input: z.infer<typeof voiceSendInputSchema>): Promise<VoiceSendResult> {
  if (config.ttsProvider !== "minimax") {
    throw new Error(`Unsupported TTS provider: ${config.ttsProvider}`);
  }

  const minimaxConfig = parseMinimaxConfig(process.env);
  if (!minimaxConfig) {
    throw new Error("MiniMax is not configured. Set MINIMAX_API_KEY.");
  }

  const audio = await synthesizeVoice(minimaxConfig, input.text);
  await fs.mkdir(config.voiceDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.mp3`;
  await fs.writeFile(path.join(config.voiceDir, filename), audio);

  return {
    audioUrl: `${config.publicBaseUrl}/voice/${filename}`,
    mimeType: "audio/mpeg",
    text: input.text,
    senderName: input.senderName ?? "Anna",
    durationMs: null,
    createdAt: new Date().toISOString()
  };
}

export function createMcpServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: "voice-send",
    version: "0.1.0"
  });
  const csp = voiceCspMeta(config);

  server.registerResource(
    "voice-bubble",
    VOICE_BUBBLE_URI,
    {
      title: "Voice Bubble",
      description: "Playable in-chat voice message widget.",
      mimeType: VOICE_BUBBLE_MIME,
      _meta: csp
    },
    async () => ({
      contents: [
        {
          uri: VOICE_BUBBLE_URI,
          mimeType: VOICE_BUBBLE_MIME,
          text: voiceBubbleHtml(config.widgetTheme),
          _meta: csp
        }
      ]
    })
  );

  server.registerTool(
    "voice_send",
    {
      title: "Send Voice Message",
      description: "Synthesize a short voice message and render it as a playable bubble in the chat.",
      inputSchema: voiceSendInputSchema,
      outputSchema: voiceSendResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      _meta: {
        ui: { resourceUri: VOICE_BUBBLE_URI },
        "openai/outputTemplate": VOICE_BUBBLE_URI
      }
    },
    async (input) => {
      const output = await createVoice(config, input);
      return {
        content: [{ type: "text", text: `Voice message from ${output.senderName}: ${output.text}` }],
        structuredContent: output,
        _meta: { ui: { resourceUri: VOICE_BUBBLE_URI } }
      };
    }
  );

  return server;
}
