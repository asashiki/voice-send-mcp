import { App } from "@modelcontextprotocol/ext-apps";

interface BubbleData {
  audioUrl: string;
  mimeType?: string;
  text?: string;
  senderName?: string;
  durationMs?: number | null;
}

declare global {
  interface Window {
    openai?: { toolOutput?: unknown; [k: string]: unknown };
  }
}

function coerce(data: unknown): BubbleData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.audioUrl !== "string") return null;
  return {
    audioUrl: d.audioUrl,
    mimeType: typeof d.mimeType === "string" ? d.mimeType : "audio/mpeg",
    text: typeof d.text === "string" ? d.text : "",
    senderName: typeof d.senderName === "string" ? d.senderName : "Anna",
    durationMs: typeof d.durationMs === "number" ? d.durationMs : null
  };
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PLAY_SVG =
  '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l11.2-6.86a1.03 1.03 0 0 0 0-1.76L9.56 4.26A1.03 1.03 0 0 0 8 5.14z"/></svg>';
const PAUSE_SVG =
  '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4"/><rect x="14" y="4.5" width="4" height="15" rx="1.4"/></svg>';

/* Deterministic pseudo-random bar heights so the waveform is stable across renders. */
const BAR_HEIGHTS = [38, 62, 88, 54, 72, 95, 60, 42, 78, 98, 66, 50, 84, 58, 70, 44, 90, 62, 48, 74, 56, 86, 40, 68];

let rendered = false;

function render(data: BubbleData, platform: "chatgpt" | "claude") {
  rendered = true;
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = "";
  root.className = `platform-${platform}`;

  const msg = document.createElement("div");
  msg.className = "msg";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const voice = document.createElement("div");
  voice.className = "voice";

  const audio = document.createElement("audio");
  audio.src = data.audioUrl;
  audio.preload = "metadata";

  const pp = document.createElement("button");
  pp.className = "pp";
  pp.setAttribute("aria-label", "播放语音");
  pp.innerHTML = PLAY_SVG + PAUSE_SVG;

  const wave = document.createElement("div");
  wave.className = "wave";
  const bars: HTMLElement[] = [];

  const estimateSeconds = data.durationMs ? data.durationMs / 1000 : Math.max(2, (data.text || "").trim().length / 5.8);
  const barCount = Math.min(96, Math.max(28, Math.round(estimateSeconds * 8)));
  bubble.style.setProperty("--bubble-w", `${Math.min(560, 142 + barCount * 5.6)}px`);

  for (let i = 0; i < barCount; i += 1) {
    const seed = (data.text || data.audioUrl || "").charCodeAt(i % Math.max((data.text || data.audioUrl).length, 1)) || 17;
    const h = BAR_HEIGHTS[(i + seed) % BAR_HEIGHTS.length];
    const bar = document.createElement("i");
    bar.style.setProperty("--h", String(h));
    bar.style.setProperty("--d", String(i));
    wave.appendChild(bar);
    bars.push(bar);
  }

  const dur = document.createElement("div");
  dur.className = "dur";
  dur.textContent = data.durationMs ? fmtTime(data.durationMs / 1000) : "0:00";

  const setProgress = (ratio: number) => {
    const lit = Math.round(ratio * bars.length);
    bars.forEach((bar, i) => bar.classList.toggle("done", i < lit));
  };

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration)) dur.textContent = fmtTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setProgress(audio.currentTime / audio.duration);
      dur.textContent = fmtTime(audio.duration - audio.currentTime);
    }
  });
  audio.addEventListener("play", () => voice.classList.add("playing"));
  audio.addEventListener("pause", () => voice.classList.remove("playing"));
  audio.addEventListener("ended", () => {
    voice.classList.remove("playing");
    setProgress(0);
    dur.textContent = fmtTime(audio.duration || 0);
  });
  audio.addEventListener("error", () => {
    voice.classList.remove("playing");
    dur.textContent = "✕";
    pp.setAttribute("aria-label", "音频加载失败");
  });

  pp.addEventListener("click", () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  });

  /* Click the waveform to seek. */
  wave.addEventListener("click", (e) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = wave.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
    if (audio.paused) void audio.play();
  });

  voice.append(pp, wave, dur);
  bubble.appendChild(voice);
  msg.append(bubble, audio);
  root.appendChild(msg);
}

function showError(msg: string) {
  if (rendered) return;
  const root = document.getElementById("root");
  if (root) root.innerHTML = `<div class="err">${msg}</div>`;
}

function renderToolResult(params: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }> }, platform: "chatgpt" | "claude") {
  let data = coerce(params?.structuredContent);
  if (!data && Array.isArray(params?.content)) {
    for (const block of params.content) {
      if (block.type === "text" && block.text) {
        try { const p = JSON.parse(block.text); data = coerce(p); if (data) break; } catch { /* not json */ }
      }
    }
  }
  if (data) render(data, platform);
}

function tryChatGpt() {
  if (!window.openai) return;
  const apply = () => {
    const data = coerce(window.openai?.toolOutput);
    if (data) render(data, "chatgpt");
  };
  apply();
  window.addEventListener("openai:set_globals", apply as EventListener);
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.jsonrpc !== "2.0") return;
    if (message.method !== "ui/notifications/tool-result") return;
    renderToolResult(message.params, "chatgpt");
  }, { passive: true });
}

async function tryMcpApps() {
  try {
    const app = new App({ name: "asashiki-voice-send", version: "0.2.0" });
    /* Register before connect() — host may send toolresult during/right after handshake */
    app.addEventListener("toolresult", (params: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }> }) => {
      console.debug("[voice-bubble] ontoolresult:", JSON.stringify(params)?.slice(0, 300));
      renderToolResult(params, "claude");
    });
    await app.connect();
  } catch (e) {
    console.debug("[voice-bubble] MCP Apps connect skipped:", e);
  }
}

function boot() {
  /* Run both bridges in parallel — rendered flag prevents double-render */
  tryChatGpt();
  void tryMcpApps();
  setTimeout(() => showError("等待语音数据..."), 4000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
