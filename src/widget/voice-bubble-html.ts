import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Bump the version suffix whenever the widget changes — hosts cache ui:// resources by URI. */
export const VOICE_BUBBLE_URI = "ui://widget/voice-bubble-v7.html";
export const VOICE_BUBBLE_MIME = "text/html;profile=mcp-app";

/* Asashiki Design · 樱羽 Sakura tokens (inlined), light + dark via prefers-color-scheme. */
const CSS = `
  :root {
    --bg-tint:#fff2f9; --surface:#ffffff;
    --border:#f3dce9; --border-strong:#e9c4d9;
    --text:#3a3340; --text-2:#8a7d8f; --text-3:#b8aabb;
    --accent:#e96ba8; --accent-soft:#fdd9ec;
    --accent-2:#8b8bef; --accent-2-soft:#e1e1fe; --on-accent:#ffffff;
    --shadow:0 1px 2px rgba(180,120,160,.06),0 4px 16px rgba(180,120,160,.08);
    --radius-s:7px; --radius-m:10px; --radius-l:14px;
    --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","PingFang SC","Hiragino Sans","Microsoft YaHei UI","Noto Sans SC",sans-serif;
    --mono:ui-monospace,"SF Mono","Cascadia Code","JetBrains Mono",Consolas,monospace;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-tint:#372240; --surface:#201b2a;
      --border:#3e3149; --border-strong:#564662;
      --text:#f1eaf4; --text-2:#b3a2ba; --text-3:#7d6e86;
      --accent:#f48fc4; --accent-soft:#4f2745;
      --accent-2:#a9a9fa; --accent-2-soft:#30305f; --on-accent:#2a1320;
      --shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.35);
    }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:transparent; font-family:var(--font); color:var(--text);
         -webkit-font-smoothing:antialiased; }
  #root { padding:4px 0; }

  .msg { max-width:min(560px, 100%); animation:msgIn .3s ease; }
  @keyframes msgIn { from { transform:translateY(5px); opacity:0; } to { transform:none; opacity:1; } }

  .bubble { width:min(var(--bubble-w, 360px), calc(100vw - 12px));
            background:linear-gradient(180deg, var(--surface), var(--bg-tint));
            border:1px solid var(--border);
            border-radius:var(--radius-l);
            padding:10px 13px;
            box-shadow:var(--shadow); }

  .voice { display:flex; align-items:center; gap:11px; width:100%; }
  .pp { width:34px; height:34px; border-radius:50%; flex-shrink:0; border:none; cursor:pointer;
        background:linear-gradient(135deg, var(--accent), var(--accent-2)); color:var(--on-accent);
        display:flex; align-items:center; justify-content:center;
        transition:all .18s ease; box-shadow:0 1px 3px rgba(0,0,0,.12); }
  .pp:hover { filter:brightness(1.07); }
  .pp:active { transform:scale(.94); }
  .pp svg { width:13px; height:13px; display:block; }
  .pp .i-pause { display:none; }
  .voice.playing .pp .i-play { display:none; }
  .voice.playing .pp .i-pause { display:block; }

  .wave { display:flex; align-items:center; gap:3px; height:34px; flex:1; min-width:0; cursor:pointer; }
  .wave i { flex:1 1 3px; min-width:2px; max-width:4px; border-radius:3px;
            background:var(--text-3); opacity:.5; height:calc(var(--h) * 1%);
            transition:background .15s ease, opacity .15s ease, transform .15s ease; }
  .wave i.done { background:var(--accent); opacity:1; }
  .voice.playing .wave i { animation:wavebob 1s ease-in-out infinite;
                           animation-delay:calc(var(--d) * -0.09s); }
  @keyframes wavebob {
    0%, 100% { transform:scaleY(.6); }
    50% { transform:scaleY(1.15); }
  }

  .dur { font-family:var(--mono); font-size:11.5px; color:var(--text-2); min-width:34px; text-align:right; }
  .err { color:var(--text-3); font-size:13px; padding:6px 2px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:.01ms !important; }
  }
`;

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

export function voiceBubbleHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${CSS}</style></head>
<body><div id="root"></div><script>${widgetJs()}</script></body></html>`;
}
