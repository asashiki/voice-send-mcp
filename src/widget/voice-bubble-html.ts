import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Bump the version suffix whenever the widget changes — hosts cache ui:// resources by URI. */
export const VOICE_BUBBLE_URI = "ui://widget/voice-bubble-v6.html";
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

  .msg { display:flex; gap:10px; max-width:400px; animation:msgIn .3s ease; }
  @keyframes msgIn { from { transform:translateY(5px); opacity:0; } to { transform:none; opacity:1; } }
  .ava { width:32px; height:32px; border-radius:var(--radius-m); flex-shrink:0;
         display:flex; align-items:center; justify-content:center;
         background:var(--accent-2-soft); color:var(--accent-2);
         font-weight:700; font-size:14px; }
  .stack { display:flex; flex-direction:column; gap:4px; min-width:0; flex:1; }
  .who { font-size:11px; color:var(--text-3); padding-left:4px; font-family:var(--mono); }

  .bubble { background:var(--bg-tint); border:1px solid var(--border);
            border-radius:var(--radius-l); border-top-left-radius:var(--radius-s);
            padding:9px 13px; }

  .voice { display:flex; align-items:center; gap:10px; min-width:218px; }
  .pp { width:30px; height:30px; border-radius:50%; flex-shrink:0; border:none; cursor:pointer;
        background:var(--accent); color:var(--on-accent);
        display:flex; align-items:center; justify-content:center;
        transition:all .18s ease; box-shadow:0 1px 3px rgba(0,0,0,.12); }
  .pp:hover { filter:brightness(1.07); }
  .pp:active { transform:scale(.94); }
  .pp svg { width:12px; height:12px; display:block; }
  .pp .i-pause { display:none; }
  .voice.playing .pp .i-play { display:none; }
  .voice.playing .pp .i-pause { display:block; }

  .wave { display:flex; align-items:center; gap:2.5px; height:26px; flex:1; cursor:pointer; }
  .wave i { width:3px; border-radius:2px; background:var(--text-3); opacity:.55;
            height:calc(var(--h) * 1%); transition:background .15s ease, opacity .15s ease; }
  .wave i.done { background:var(--accent); opacity:1; }
  .voice.playing .wave i { animation:wavebob 1s ease-in-out infinite;
                           animation-delay:calc(var(--d) * -0.09s); }
  @keyframes wavebob {
    0%, 100% { transform:scaleY(.6); }
    50% { transform:scaleY(1.15); }
  }

  .dur { font-family:var(--mono); font-size:11.5px; color:var(--text-2); min-width:32px; text-align:right; }
  .caption { font-size:13px; color:var(--text-2); line-height:1.5; overflow-wrap:anywhere;
             padding:2px 4px 0; }
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
