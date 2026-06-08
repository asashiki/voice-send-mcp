# voice-send

Standalone MCP server for sending short playable voice messages in AI chat clients. It exposes a `voice_send` tool, synthesizes speech through MiniMax T2A, stores the mp3, and returns a `ui://` widget so MCP Apps capable clients can render an in-chat audio bubble.

GitHub target: `https://github.com/asashiki/voice-send-mcp`

Public test endpoint:

```text
https://mcp.asashiki.com/mcp/voice
```

This repository is designed as a complete GitHub-ready MCP tool project: local stdio MCP, remote Streamable HTTP MCP, Docker deployment, typed configuration, CI, and public-safe docs.

## References

Primary MCP references:

- MCP: `https://modelcontextprotocol.io/`
- Transports: `https://modelcontextprotocol.io/docs/concepts/transports`
- MCP Apps: `https://modelcontextprotocol.io/docs/extensions/apps`
- MCP Apps API: `https://apps.extensions.modelcontextprotocol.io/`

Client-specific references:

- Claude Connectors: `https://claude.com/docs/connectors/overview`
- OpenAI Apps SDK: `https://developers.openai.com/apps-sdk`

The implementation follows MCP first. Claude and ChatGPT differences are kept to compatibility metadata, CSP aliases, and widget host bridge code.

## Features

- Local MCP: stdio transport via `npm run start:stdio` or the `voice-send-mcp` bin after build.
- Remote MCP: Streamable HTTP endpoint, default path `/mcp/voice`.
- Compatibility endpoint: `/mcp` is also registered for direct local smoke tests.
- Public audio hosting: generated mp3 files served from `GET /voice/<uuid>.mp3`.
- Health check: `GET /healthz`.
- MCP tool: `voice_send`, input `{ text, senderName? }`.
- MCP resource: `ui://widget/voice-bubble-v1.html`, MIME `text/html;profile=mcp-app`.
- MCP Apps UI: one shared visual UI for Claude and ChatGPT.
- Client compatibility: standard `_meta.ui.resourceUri` plus ChatGPT `openai/outputTemplate`.
- Widget CSP: MCP Apps standard CSP plus ChatGPT `openai/widgetCSP`.
- Configurable TTS: provider, model, voice, speed, volume, pitch, sample rate, bitrate, format, channel.

## Quick Start

```bash
npm install
npm run build
```

For local stdio MCP:

```bash
PUBLIC_BASE_URL=https://mcp.asashiki.com MINIMAX_API_KEY=... npm run start:stdio
```

For remote HTTP MCP:

```bash
PUBLIC_BASE_URL=https://mcp.asashiki.com MCP_HTTP_PATH=/mcp/voice MINIMAX_API_KEY=... npm start
```

Remote clients connect to:

```text
https://mcp.asashiki.com/mcp/voice
```

## Local MCP Configuration

Use stdio when the MCP client runs on the same machine as this project.

Example MCP client config:

```json
{
  "mcpServers": {
    "voice-send": {
      "command": "node",
      "args": ["/absolute/path/to/voice-send/dist/stdio.js"],
      "env": {
        "MINIMAX_API_KEY": "...",
        "PUBLIC_BASE_URL": "https://mcp.asashiki.com",
        "MCP_HTTP_PATH": "/mcp/voice"
      }
    }
  }
}
```

The widget needs an audio URL that the host sandbox can fetch. For Claude / ChatGPT UI rendering, use a public HTTPS `PUBLIC_BASE_URL` or run the HTTP server behind a tunnel/reverse proxy. Pure CLI clients can call the tool, but in-chat UI rendering depends on MCP Apps support.

## Remote Domain Deployment

Set:

```bash
PUBLIC_BASE_URL=https://mcp.asashiki.com
MCP_HTTP_PATH=/mcp/voice
ALLOWED_ORIGINS=https://mcp.asashiki.com
```

The MCP endpoint becomes:

```text
${PUBLIC_BASE_URL}${MCP_HTTP_PATH}
```

The audio URL becomes:

```text
${PUBLIC_BASE_URL}/voice/<uuid>.mp3
```

If audio is served from a different origin, set `MCP_VOICE_AUDIO_ORIGIN` so the widget CSP allows it:

```bash
MCP_VOICE_AUDIO_ORIGIN=https://audio.example.com
```

With Docker Compose:

```bash
cp .env.example .env
# edit .env
docker compose up -d --build
```

Example Caddy reverse proxy config is in `deploy/Caddyfile.example`.

## Environment

Core:

```bash
PUBLIC_BASE_URL=https://mcp.asashiki.com
PORT=3000
MCP_HTTP_PATH=/mcp/voice
ALLOWED_ORIGINS=https://mcp.asashiki.com
VOICE_DIR=/app/data/voice
VOICE_RETENTION_HOURS=24
MCP_VOICE_AUDIO_ORIGIN=
```

TTS:

```bash
TTS_PROVIDER=minimax
MINIMAX_API_KEY=
MINIMAX_API_BASE_URL=https://api.minimaxi.com/v1/t2a_v2
MINIMAX_MODEL=speech-2.8-hd
MINIMAX_VOICE_ID=AnnaClone2026new
MINIMAX_VOICE_SPEED=1
MINIMAX_VOICE_VOLUME=1
MINIMAX_VOICE_PITCH=0
MINIMAX_SAMPLE_RATE=32000
MINIMAX_BITRATE=128000
MINIMAX_AUDIO_FORMAT=mp3
MINIMAX_CHANNEL=1
```

Widget UI:

```bash
VOICE_WIDGET_ACCENT_COLOR=#2f6df6
VOICE_WIDGET_AVATAR_GRADIENT=linear-gradient(135deg,#5b8cff,#8a5bff)
VOICE_WIDGET_PLAYER_RADIUS=14px
```

## Claude And ChatGPT UI

There is one visual UI implementation. The widget still has two host bridge paths because current clients expose tool results differently:

- ChatGPT: `window.openai.toolOutput` and `openai:set_globals`.
- Claude / MCP Apps: `@modelcontextprotocol/ext-apps` `App.connect()` and `ontoolresult`.

The server also emits both metadata forms:

- MCP Apps standard: `_meta.ui.resourceUri`.
- ChatGPT compatibility alias: `_meta["openai/outputTemplate"]`.

The CSS no longer intentionally styles Claude and ChatGPT differently. If client-specific fixes become necessary, keep them as narrow compatibility patches.

## Development

```bash
npm run dev
npm run dev:stdio
npm run typecheck
npm run build
docker build -t voice-send-mcp:local .
```

Generated files:

- `dist/server.js`: remote HTTP server.
- `dist/stdio.js`: local stdio MCP server.
- `dist/widget/voice-bubble-widget.global.js`: browser IIFE inlined into the `ui://` HTML resource.

## Client Notes

- Claude and ChatGPT cache `ui://` resources by URI. Bump `VOICE_BUBBLE_URI` in `src/widget/voice-bubble-html.ts` after widget HTML/JS changes.
- MCP Apps resources use MIME `text/html;profile=mcp-app`.
- Keep both CSP namespaces: `_meta.ui.csp.resourceDomains` and `_meta["openai/widgetCSP"].resource_domains`.
- The widget uses `@modelcontextprotocol/ext-apps` with `app.connect()` default transport. Do not manually construct `PostMessageTransport(window.parent, window)`.
- Streamable HTTP deployments should validate `Origin`; this project uses `ALLOWED_ORIGINS`.

## Repository Layout

```text
src/
  backend/minimax.ts          MiniMax T2A connector
  config.ts                   environment parsing
  mcp.ts                      tools/resources registration
  server.ts                   Streamable HTTP server
  stdio.ts                    local stdio MCP entry
  widget/                     MCP Apps widget HTML and browser runtime
scripts/build-widget.mjs      bundles widget runtime as browser IIFE
deploy/Caddyfile.example      domain reverse proxy example
Dockerfile                    production image
docker-compose.yml            single-service deployment
```

## GitHub Setup

Create the GitHub repository under `asashiki`:

```bash
git init
git branch -M main
git add .
git commit -m "Initial voice-send MCP project"
git remote add origin git@github.com:asashiki/voice-send-mcp.git
git push -u origin main
```

Do not commit real `.env` files, API keys, private deployment notes, or unfinished planning docs. Store those in Viking under the matching project folder.

## License

MIT
