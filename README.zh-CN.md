<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="voice-send-mcp — 对话里的语音气泡" src=".github/assets/banner-light.svg" width="100%">
</picture>

[![CI](https://github.com/asashiki/voice-send-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/asashiki/voice-send-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-e96ba8.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-8b8bef)
![MCP](https://img.shields.io/badge/MCP-stdio%20%2B%20Streamable%20HTTP-3a3340)

[English](README.md) · **简体中文**

</div>

# voice-send

让 AI 在聊天里发可播放语音消息的独立 MCP 服务。它提供 `voice_send` 工具：用四种 TTS 之一合成语音、存为 mp3，并返回 `ui://` widget——支持 MCP Apps 的客户端（claude.ai / ChatGPT 网页端）会在对话里渲染出一个类 Telegram 的语音气泡，点击即可播放。

部署后的端点形如：

```text
https://voice.example.com/mcp/voice
```

## 功能亮点

- **语音气泡 UI**（浅仪式樱羽设计，浅/深色自动）：头像 + 发送者名、波形进度（已播部分变色）、点击波形跳转、播放律动动画。
- **四家 TTS 自动探测**：`TTS_PROVIDER=auto`（默认）按 minimax → elevenlabs → openai → edge 的顺序选第一个配好的；什么 key 都没有也能用免费的 Edge TTS 直接出声。
- 每家 provider 有文档化的单次输入上限并自动截断（可用 `TTS_MAX_TEXT_LENGTH` 覆盖）。
- 双传输：本地 stdio + 远程 Streamable HTTP（`/mcp/voice`，保留 `/mcp` 别名）；`/healthz` 健康检查；mp3 由 `GET /voice/<uuid>.mp3` 公网托管，按 `VOICE_RETENTION_HOURS` 自动清理。
- Claude / ChatGPT 双端兼容：`_meta.ui.resourceUri` + `openai/outputTemplate` 双写，CSP 两套命名空间双写。

## TTS 供应商对比

| Provider | 质量 | 费用 | 所需 Key | 单次上限 |
|---|---|---|---|---|
| `edge`（免 key 默认） | 良好 | 免费 | 无 | 5000 |
| `minimax` | 优秀（支持克隆声线） | 付费 | `MINIMAX_API_KEY` | 10000 |
| `openai`（兼容任何 OpenAI 风格端点） | 良好 | 付费 | `OPENAI_API_KEY` | 4096 |
| `elevenlabs` | 优秀 | 付费 | `ELEVENLABS_API_KEY` | 10000 |

> Edge TTS 提示：微软会屏蔽部分数据中心 IP（WebSocket 403）。VPS 上如果遇到，换 minimax / openai / elevenlabs。
> MiniMax 提示：国内 token plan 的 key 要用 `api.minimaxi.com` 端点（默认值已是）；如果 API 报 group_id required，补 `MINIMAX_GROUP_ID`。

## 快速开始

```bash
npm install
npm run build
# 远程 HTTP（什么 key 都不配就走免费 Edge TTS）：
PUBLIC_BASE_URL=https://你的域名 npm start
# 本地 stdio：
PUBLIC_BASE_URL=https://你的域名 npm run start:stdio
```

### Claude Desktop（stdio）配置

```json
{
  "mcpServers": {
    "voice-send": {
      "command": "node",
      "args": ["/绝对路径/voice-send-mcp/dist/stdio.js"],
      "env": {
        "MINIMAX_API_KEY": "...",
        "PUBLIC_BASE_URL": "https://你的域名"
      }
    }
  }
}
```

widget 里的音频 URL 必须是宿主沙箱能访问到的地址，所以 `PUBLIC_BASE_URL` 要是公网 HTTPS（或挂隧道/反代）。纯 CLI 客户端能调工具，但对话内 UI 渲染依赖 MCP Apps 支持。

## 远程部署（连接 claude.ai / ChatGPT 网页端）

```bash
cp .env.example .env   # 编辑：PUBLIC_BASE_URL / TTS provider 的 key
docker compose up -d --build
```

反向代理 `https://你的域名/mcp/voice` 和 `https://你的域名/voice/*` 到容器 `:3000`（Caddy 示例见 `deploy/Caddyfile.example`）。然后在 claude.ai 添加自定义连接器填 MCP 地址，OAuth 两项留空。

如果音频走另一个域名，设置 `MCP_VOICE_AUDIO_ORIGIN` 让 widget CSP 放行。

## 环境变量

核心：

```bash
PUBLIC_BASE_URL=https://你的域名
PORT=3000
MCP_HTTP_PATH=/mcp/voice
ALLOWED_ORIGINS=https://你的域名
VOICE_DIR=/app/data/voice
VOICE_RETENTION_HOURS=24
```

TTS（全部可选项见 `.env.example`）：

```bash
TTS_PROVIDER=auto
# Edge：EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural（可选 RATE/PITCH/VOLUME）
# MiniMax：MINIMAX_API_KEY / MINIMAX_VOICE_ID / MINIMAX_MODEL ...
# OpenAI 兼容：OPENAI_API_KEY / OPENAI_TTS_BASE_URL / OPENAI_TTS_MODEL / OPENAI_TTS_VOICE
# ElevenLabs：ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID
```

## 客户端注意事项

- claude.ai / ChatGPT 按 URI 缓存 `ui://` 资源：改过 widget 必须升级 `src/widget/voice-bubble-html.ts` 里的 `VOICE_BUBBLE_URI` 版本号（当前 `voice-bubble-v2.html`）。
- MCP Apps 资源 MIME 必须是 `text/html;profile=mcp-app`。
- CSP 两套都要写：`_meta.ui.csp.resourceDomains`（Claude）+ `_meta["openai/widgetCSP"].resource_domains`（ChatGPT）。
- widget 用 `app.connect()` 默认传输，不要手动构造 `PostMessageTransport(window.parent, window)`。

## 代码结构

```text
src/
  backend/                    TTS providers（minimax / openai / elevenlabs / edge）+ 注册表
  config.ts                   环境变量解析
  mcp.ts                      工具/资源注册
  schemas.ts                  zod 输入输出 schema
  server.ts                   Streamable HTTP 服务
  stdio.ts                    本地 stdio 入口
  widget/                     MCP Apps widget HTML 与浏览器运行时
scripts/build-widget.mjs      widget 打包为浏览器 IIFE
deploy/Caddyfile.example      反代示例
```

## 开发

```bash
npm run dev          # HTTP 服务热重载
npm run typecheck
npm run build
docker build -t voice-send-mcp:local .
```

真实 `.env`、API key、私有部署记录不要提交进仓库。

## 许可

MIT
