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
    openai?: {
      toolOutput?: unknown;
      [k: string]: unknown;
    };
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

let rendered = false;

function render(data: BubbleData, platform: "chatgpt" | "claude") {
  rendered = true;
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = "";
  root.className = `platform-${platform}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = (data.senderName || "A").slice(0, 1).toUpperCase();

  const body = document.createElement("div");
  body.className = "body";

  const audio = document.createElement("audio");
  audio.src = data.audioUrl;
  audio.preload = "metadata";

  const playBtn = document.createElement("button");
  playBtn.className = "play";
  playBtn.setAttribute("aria-label", "play");
  playBtn.textContent = "▶";

  const waves = document.createElement("div");
  waves.className = "waves";
  for (let i = 0; i < 28; i += 1) {
    const bar = document.createElement("span");
    bar.style.height = `${20 + Math.abs(Math.sin(i * 1.7)) * 70}%`;
    waves.appendChild(bar);
  }

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = data.durationMs ? fmtTime(data.durationMs / 1000) : "0:00";

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration)) time.textContent = fmtTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const pct = audio.currentTime / audio.duration;
      waves.style.setProperty("--progress", `${Math.round(pct * 100)}%`);
      time.textContent = fmtTime(audio.duration - audio.currentTime);
    }
  });
  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    waves.style.setProperty("--progress", "0%");
    time.textContent = data.durationMs ? fmtTime(data.durationMs / 1000) : fmtTime(audio.duration || 0);
  });
  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      void audio.play();
      playBtn.textContent = "⏸";
    } else {
      audio.pause();
      playBtn.textContent = "▶";
    }
  });

  const player = document.createElement("div");
  player.className = "player";
  player.append(playBtn, waves, time);

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = data.senderName || "Anna";

  body.append(name, player);
  if (data.text) {
    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = data.text;
    body.appendChild(caption);
  }

  bubble.append(avatar, body, audio);
  root.appendChild(bubble);
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
    const app = new App({ name: "asashiki-voice-send", version: "0.1.0" });
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
