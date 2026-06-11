import { z } from "zod";

export const voiceSendInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(500)
    .describe("Spoken text, 1-500 chars. One or two short sentences are ideal for a chat voice bubble."),
  senderName: z
    .string()
    .min(1)
    .max(60)
    .optional()
    .describe("Display name shown on the bubble. Defaults to 'Anna'.")
});

export type VoiceSendInput = z.infer<typeof voiceSendInputSchema>;

export const voiceSendResultSchema = z.object({
  audioUrl: z.string().url(),
  mimeType: z.string(),
  text: z.string(),
  senderName: z.string(),
  durationMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string()
});

export type VoiceSendResult = z.infer<typeof voiceSendResultSchema>;
