import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { voiceMedia } from "./media.js";
test("public WAV media preserves correct MIME, CORS and byte ranges",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"voice-media-"));
 await writeFile(join(dir,"test.wav"),Buffer.from("RIFF1234WAVEdata"));
 const app=express();app.use("/voice",voiceMedia(dir));
 const server=app.listen(0,"127.0.0.1");
 await new Promise<void>(resolve=>server.once("listening",resolve));
 try {
  const address=server.address() as {port:number};
  const response=await fetch(`http://127.0.0.1:${address.port}/voice/test.wav`,{headers:{Range:"bytes=0-3",Origin:"https://chat.example"}});
  assert.equal(response.status,206);assert.match(response.headers.get("content-type")!,/^audio\/(?:x-)?wav/);
  assert.equal(response.headers.get("access-control-allow-origin"),"*");
  assert.equal(response.headers.get("cross-origin-resource-policy"),"cross-origin");
  assert.equal(await response.text(),"RIFF");
 } finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true}); }
});
