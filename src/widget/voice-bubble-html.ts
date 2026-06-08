import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WidgetThemeConfig } from "../config.js";

export const VOICE_BUBBLE_URI = "ui://widget/voice-bubble-v1.html";
export const VOICE_BUBBLE_MIME = "text/html;profile=mcp-app";

function css(theme: WidgetThemeConfig): string {
  return `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; background: transparent; }
  #root { padding: 8px; }
  .bubble { display: flex; gap: 10px; align-items: flex-start; max-width: 420px; }
  .avatar { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%;
            background: ${theme.avatarGradient}; color:#fff; font-weight:700;
            display:flex; align-items:center; justify-content:center; font-size:1.05rem; }
  .body { flex: 1 1 auto; min-width: 0; }
  .name { font-size: .8rem; color: #888; margin: 2px 0 5px; }
  .player { display:flex; align-items:center; gap:10px; background:#e7f0ff; border-radius:${theme.playerRadius};
            padding:9px 12px; }
  .play { flex:0 0 auto; width:34px; height:34px; border-radius:50%; border:none; cursor:pointer;
          background:${theme.accentColor}; color:#fff; font-size:.85rem; line-height:1; }
  .waves { position:relative; flex:1 1 auto; height:26px; display:flex; align-items:center; gap:2px;
           overflow:hidden; --progress:0%; }
  .waves span { flex:1 1 auto; background:#9db8ee; border-radius:2px; min-width:2px; }
  .waves::after { content:""; position:absolute; left:0; top:0; bottom:0; width:var(--progress);
                  background:color-mix(in srgb, ${theme.accentColor} 25%, transparent); pointer-events:none; transition:width .1s linear; }
  .time { flex:0 0 auto; font-variant-numeric:tabular-nums; font-size:.78rem; color:#456; min-width:34px; text-align:right; }
  .caption { margin-top:6px; font-size:.85rem; color:#444; line-height:1.4; overflow-wrap:anywhere; }
  .err { color:#999; font-size:.85rem; padding:6px; }
  @media (prefers-color-scheme: dark) {
    .name { color:#9aa3b2; } .player { background:#1f2733; }
    .waves span { background:#3a4a66; } .time { color:#9bb; } .caption { color:#cdd3dc; }
  }
`;
}

let cachedJs: string | null = null;

function widgetJs(): string {
  if (cachedJs !== null) return cachedJs;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const jsPath = resolve(here, "widget/voice-bubble-widget.global.js");
    cachedJs = readFileSync(jsPath, "utf8");
  } catch {
    cachedJs = `document.getElementById("root").innerHTML='<div class="err">语音组件未构建</div>';`;
  }
  return cachedJs;
}

export function voiceBubbleHtml(theme: WidgetThemeConfig): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css(theme)}</style></head>
<body><div id="root"></div><script>${widgetJs()}</script></body></html>`;
}
