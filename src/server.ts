import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { resolveProvider } from "./backend/registry.js";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./mcp.js";

const config = loadConfig({ requirePublicBaseUrl: true });

const mcpPaths = Array.from(new Set([config.mcpHttpPath, "/mcp"]));

async function cleanupOldVoiceFiles() {
  if (config.voiceRetentionHours <= 0) return;
  const cutoff = Date.now() - config.voiceRetentionHours * 60 * 60 * 1000;
  let entries: string[];
  try {
    entries = await fs.readdir(config.voiceDir);
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((name) => name.endsWith(".mp3"))
      .map(async (name) => {
        const file = path.join(config.voiceDir, name);
        try {
          const stat = await fs.stat(file);
          if (stat.mtimeMs < cutoff) await fs.unlink(file);
        } catch {
          // Best-effort cleanup; request handling should not depend on it.
        }
      })
  );
}

async function main() {
  await fs.mkdir(config.voiceDir, { recursive: true });

  const app = express();
  app.set("trust proxy", true);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    }
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/voice", express.static(config.voiceDir, {
    immutable: true,
    maxAge: "1d",
    setHeaders(res) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "audio/mpeg");
    }
  }));

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "voice-send",
      transport: "streamable-http",
      ttsProvider: (() => { try { return resolveProvider(process.env).name; } catch { return "invalid"; } })(),
      publicBaseUrl: config.publicBaseUrl,
      mcpEndpoint: `${config.publicBaseUrl}${config.mcpHttpPath}`,
      audioOrigins: config.audioOrigins,
      allowedOrigins: config.allowedOrigins
    });
  });

  app.all(mcpPaths, async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    const server = createMcpServer(config);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error"
          },
          id: null
        });
      }
    } finally {
      void transport.close();
      void server.close();
    }
  });

  setInterval(() => {
    void cleanupOldVoiceFiles();
  }, 60 * 60 * 1000).unref();
  void cleanupOldVoiceFiles();

  const httpServer = app.listen(config.port, "0.0.0.0", () => {
    console.log(`voice-send MCP listening on :${config.port}`);
  });
  httpServer.keepAliveTimeout = 70_000;
  httpServer.headersTimeout = 75_000;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
