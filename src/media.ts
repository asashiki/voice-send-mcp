import express from "express";
/** Infer MIME from the actual extension; providers can return WAV/FLAC, not only MP3. */
export const voiceMedia = (directory: string) => express.static(directory, {
  immutable: true, maxAge: "1d",
  setHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
});
