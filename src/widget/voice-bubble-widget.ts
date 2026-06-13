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

  const ava = document.createElement("div");
  ava.className = "ava";
  ava.textContent = (data.senderName || "A").slice(0, 1).toUpperCase();

  const stack = document.createElement("div");
  stack.className = "stack";

  const who = document.createElement("div");
  who.className = "who";
  who.textContent = `${data.senderName || "Anna"} · 语音`;

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
  BAR_HEIGHTS.forEach((h, i) => {
    const bar = document.createElement("i");
    bar.style.setProperty("--h", String(h));
    bar.style.setProperty("--d", String(i));
    wave.appendChild(bar);
    bars.push(bar);
  });

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
    who.textContent = `${data.senderName || "Anna"} · 音频加载失败`;
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
  stack.append(who, bubble);
  if (data.text) {
    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = data.text;
    stack.appendChild(caption);
  }
  msg.append(ava, stack, audio);
  root.appendChild(msg);
}

function showError(msg: string) {
  if (rendered) return;
  const root = document.getElementById("root");
  if (root) root.innerHTML = `<div class="err">${msg}</div>`;
}

function tryChatGpt(): boolean {
  if (!window.openai) return false;
  const apply = () => {
    const data = coerce(window.openai?.toolOutput);
    if (data) render(data, "chatgpt");
  };
  apply();
  window.addEventListener("openai:set_globals", apply as EventListener);
  return true;
}

async function tryMcpApps() {
  try {
    const app = new App({ name: "asashiki-voice-send", version: "0.2.0" });
    app.ontoolresult = (params: { structuredContent?: unknown }) => {
      const data = coerce(params?.structuredContent);
      if (data) render(data, "claude");
    };
    await app.connect();
  } catch (e) {
    showError("语音组件初始化失败");
    console.error(e);
  }
}

function boot() {
  if (!tryChatGpt()) {
    void tryMcpApps();
  }
  setTimeout(() => showError("等待语音数据..."), 4000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
