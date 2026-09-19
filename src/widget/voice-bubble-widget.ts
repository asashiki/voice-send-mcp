import { connectWidget } from "./host-bridge.js";

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
let cleanupCurrent = () => {};

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
  let active = true;
  cleanupCurrent = () => { active = false; audio.pause(); audio.removeAttribute("src"); audio.load(); };
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
  const barCount = Math.min(88, Math.max(28, Math.round(estimateSeconds * 7.2)));
  bubble.style.setProperty("--bubble-w", `${Math.min(520, 136 + barCount * 5)}px`);

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

  const startPlayback = async () => {
    try { if (audio.error) audio.load(); await audio.play(); }
    catch (error) {
      if (!active || (error as Error).name === "AbortError") return;
      voice.classList.remove("playing");
      dur.textContent = (error as Error).name === "NotAllowedError" ? "请点击播放" : "音频无法播放";
      pp.setAttribute("aria-label", dur.textContent);
    }
  };
  pp.addEventListener("click", () => {
    if (audio.paused) void startPlayback();
    else audio.pause();
  });

  /* Click the waveform to seek. */
  wave.addEventListener("click", (e) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = wave.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
    if (audio.paused) void startPlayback();
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

function boot() {
  connectWidget("voice-send", coerce, render, () => cleanupCurrent());
  setTimeout(() => showError("等待工具数据…"), 4000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
