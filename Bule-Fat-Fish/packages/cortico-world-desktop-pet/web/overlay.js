/**
 * The OBS overlay: the pet window's picture as the window process sends it through the World
 * (host/overlay.cjs has the frame format). The layer is the size of the display the window is on, and
 * each frame holds everything drawn, so the layer is cleared and the part put back where it is on that display.
 *
 * Frames take uneven time to be captured, sent and decoded, so each is shown `delay` milliseconds after
 * the pet window drew it: they come out as far apart as they were drawn.
 */
const canvas = document.getElementById('layer');
const ctx = canvas.getContext('2d');
/** Milliseconds before the socket is tried again after it closed. */
const RECONNECT_MS = 2000;
/**
 * `delay` rises at once to the lateness of a frame that arrives later than that, and falls by this
 * share of the time passing (10 ms a second), so it settles just above how late frames come.
 */
const DELAY_EASE = .01;

/** Deflated bytes back to raw ones. */
async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Chromium's BGRA with premultiplied alpha as canvas RGBA. */
function toImageData(bgra, width, height) {
  const out = new ImageData(width, height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = bgra[i + 3];
    if (!a) continue;
    const k = 255 / a;
    d[i] = Math.min(255, bgra[i + 2] * k);
    d[i + 1] = Math.min(255, bgra[i + 1] * k);
    d[i + 2] = Math.min(255, bgra[i] * k);
    d[i + 3] = a;
  }
  return out;
}

/** Milliseconds since the epoch, the clock the pet window stamps its frames with. */
const clock = () => performance.timeOrigin + performance.now();

/** A frame as sent: `at` is when it was drawn, null for the World's clearing frame, which has no time. */
async function decode(buffer) {
  const [W, H, x, y, w, h] = new Uint32Array(buffer, 0, 6);
  const at = buffer.byteLength >= 32 ? new DataView(buffer).getFloat64(24, true) : null;
  const pixels = w && h ? await inflate(new Uint8Array(buffer, 32)) : null;
  return { W, H, x, y, at, image: pixels && pixels.length === w * h * 4 ? toImageData(pixels, w, h) : null };
}

function show(f) {
  // 0 × 0: the window process is gone; the layer clears and keeps its size
  if (f.W && f.H && (canvas.width !== f.W || canvas.height !== f.H)) { canvas.width = f.W; canvas.height = f.H; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (f.image) ctx.putImageData(f.image, f.x, f.y);
}

/** Frames decoded and not shown yet, oldest first. */
const queue = [];
let delay = null, shownAt = -Infinity, lastTick = 0;
const due = () => clock() - (delay ?? 0);

function receive(f) {
  if (f.at === null) { queue.length = 0; show(f); return; }
  if (f.at <= shownAt) return;
  const late = clock() - f.at;
  delay = delay === null ? late : Math.max(delay, late);
  let i = queue.length;
  while (i && queue[i - 1].at > f.at) i--;
  queue.splice(i, 0, f);
  // while nothing shows them (a hidden source draws no frames), only the newest due one is kept
  while (queue.length > 1 && queue[1].at <= due()) queue.shift();
}

function tick(t) {
  if (delay !== null && lastTick) delay -= (t - lastTick) * DELAY_EASE;
  lastTick = t;
  let f = null;
  while (queue.length && queue[0].at <= due()) f = queue.shift();
  if (f) { shownAt = f.at; show(f); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function connect() {
  const ws = new WebSocket(`ws://${location.host}/socket?role=overlay`);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (e) => {
    if (typeof e.data === 'string') return;
    decode(e.data).then(receive, () => {});
  };
  ws.onclose = () => {
    queue.length = 0;
    delay = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTimeout(connect, RECONNECT_MS);
  };
}
connect();
