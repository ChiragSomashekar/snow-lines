// Capture the poster via CDP with a REAL wait (no virtual time),
// so Motion's animation clock runs to completion before the shot.
import { writeFileSync } from "node:fs";

const PORT = 9333;
const URL_TO_SHOOT = process.argv[2] ?? "http://localhost:5177/snow-lines/";
const OUT = process.argv[3] ?? "ridge-still.png";
const WAIT_MS = Number(process.argv[4] ?? 16000);
const POST_JS = process.argv[5] ?? "";

// find the browser websocket
const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });

await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride",
  { width: Number(process.env.CAP_W ?? 1040), height: Number(process.env.CAP_H ?? 1120), deviceScaleFactor: 3, mobile: false }, sessionId);
await send("Page.navigate", { url: URL_TO_SHOOT }, sessionId);

await new Promise((r) => setTimeout(r, WAIT_MS)); // real time: let Motion finish
if (POST_JS) { await send("Runtime.evaluate", { expression: POST_JS }, sessionId); await new Promise((r) => setTimeout(r, 3000)); }

const { result: { data } } = await send("Page.captureScreenshot",
  { format: "png", captureBeyondViewport: true }, sessionId);
writeFileSync(OUT, Buffer.from(data, "base64"));
console.log("saved", OUT);
await send("Target.closeTarget", { targetId });
ws.close();
