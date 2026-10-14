// Motionmaker web player: plays a piece exported by export-web.mjs live on any page, frame-exact.
// The piece runs in an iframe (its CSS and globals cannot clash with the page); this side owns the clock and asks for
// whole frames, so frame n on the website is the same picture as frame n of the rendered video.
//
//   import { mountMotion } from "./motion-player";
//   const player = mountMotion(document.querySelector("#hero")!, { src: "/motions/launch/" });
//   player.pause(); await player.seek(120); player.play();
//
// Or, with no build step: defineMotionElement() and then <motion-clip src="/motions/launch/"></motion-clip>.

export interface MotionInfo {
  fps: number;
  frames: number;
  width: number;
  height: number;
  title?: string;
  /** The poster frame chosen at export (shown with reduced motion). */
  poster?: number;
  /** A real-time page (an Anatomy figure, a web demo): it runs on its own clock, the player only starts and stops it. */
  live?: boolean;
  /** Live pieces: the page is laid out at this size and the player shows only the crop (the figure's card). */
  viewport?: { width: number; height: number };
  crop?: { x: number; y: number; width: number; height: number };
}

export interface MotionOptions {
  /** The exported folder ("/motions/launch/") or its index.html. */
  src: string;
  /** Start playing once loaded. Default true. */
  autoplay?: boolean;
  /** Wrap from the last frame to the first. Default true; when false, playback stops on the last frame and onEnd fires. */
  loop?: boolean;
  /** Playback rate, greater than 0. Default 1. */
  speed?: number;
  /** First frame shown. Default 0. */
  startFrame?: number;
  /** "aspect" (default): full width of the host, height from the piece's aspect ratio. "contain" / "cover": fill the host's own box. */
  fit?: "aspect" | "contain" | "cover";
  /** Let pointer and keyboard input reach the piece. Default: true for live pieces (visitors take an Anatomy figure apart), false otherwise (clicks pass through). */
  interactive?: boolean;
  /** Accessible name. Default: the piece's title. */
  label?: string;
  /** With prefers-reduced-motion: "poster" (default) shows posterFrame and does not autoplay; "play" ignores the setting. */
  reducedMotion?: "poster" | "play";
  /** Frame shown instead of playing when reduced motion applies. Default: the export's poster frame. */
  posterFrame?: number;
  /** Stop the clock while the piece is scrolled out of view. Default true. */
  pauseOffscreen?: boolean;
  onReady?(info: MotionInfo): void;
  onFrame?(frame: number): void;
  onEnd?(): void;
  onError?(message: string): void;
}

export interface MotionPlayer {
  /** Resolves when the piece can draw. */
  readonly ready: Promise<MotionInfo>;
  readonly info: MotionInfo | null;
  readonly frame: number;
  readonly playing: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Show a frame (wraps with loop, clamps without). Resolves once it is drawn. */
  seek(frame: number): Promise<void>;
  seekTime(seconds: number): Promise<void>;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  destroy(): void;
}

interface BridgeMessage {
  mm: 1;
  type: "ready" | "drawn" | "error" | "state" | "input";
  frame?: number;
  seq?: number;
  message?: string;
  fps?: number;
  frames?: number;
  width?: number;
  height?: number;
  title?: string;
  poster?: number;
  live?: boolean;
  viewport?: MotionInfo["viewport"];
  crop?: MotionInfo["crop"];
}

export function mountMotion(host: HTMLElement, options: MotionOptions): MotionPlayer {
  const set = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)) as MotionOptions; // an explicit undefined keeps the default
  const o = { autoplay: true, loop: true, speed: 1, startFrame: 0, fit: "aspect" as const, reducedMotion: "poster" as const, pauseOffscreen: true, ...set };
  const page = /\.html?(\?.*)?$/.test(o.src) ? o.src : o.src.replace(/\/?$/, "/index.html");
  const folder = page.replace(/[^/]*$/, "");
  const reduce = o.reducedMotion === "poster" && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const box = document.createElement("div");
  box.style.cssText = `position:relative;overflow:hidden;width:100%;${o.fit === "aspect" ? "" : "height:100%;"}background:center/contain no-repeat url("${folder}poster.jpg")`;
  box.setAttribute("role", "img");
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:absolute;left:0;top:0;border:0;transform-origin:0 0;visibility:hidden;";
  frame.setAttribute("scrolling", "no");
  box.appendChild(frame);
  host.appendChild(box);

  let info: MotionInfo | null = null, bridgeReady = false, destroyed = false;
  let pos = Math.max(0, o.startFrame), shown = -1, playing = false, wanted = o.autoplay && !reduce;
  let visible = true, raf = 0, last = 0, seq = 0, speed = o.speed > 0 ? o.speed : 1, loop = o.loop;
  let posterHold = reduce && o.autoplay; // reduced motion: hold still until the visitor touches a live piece
  const waiting: { seq: number; resolve(): void }[] = [];
  let firstDrawn: Promise<void> = Promise.resolve();
  let resolveReady!: (i: MotionInfo) => void, rejectReady!: (e: Error) => void;
  const ready = new Promise<MotionInfo>((res, rej) => { resolveReady = res; rejectReady = rej; });
  ready.catch(() => undefined);

  const label = () => { const l = o.label || info?.title || "animation"; box.setAttribute("aria-label", l); frame.title = l; };
  function setInfo(i: MotionInfo) {
    info = i;
    if (o.fit === "aspect") box.style.aspectRatio = `${i.width} / ${i.height}`;
    const vp = i.viewport || { width: i.width, height: i.height };
    frame.style.width = vp.width + "px"; frame.style.height = vp.height + "px";
    const interactive = o.interactive ?? !!i.live;
    frame.style.pointerEvents = interactive ? "" : "none";
    if (interactive) { frame.removeAttribute("tabindex"); frame.removeAttribute("aria-hidden"); }
    else { frame.setAttribute("tabindex", "-1"); frame.setAttribute("aria-hidden", "true"); }
    label(); layout();
  }
  function layout() {
    if (!info) return;
    const c = info.crop || { x: 0, y: 0, width: info.width, height: info.height };
    const cw = box.clientWidth, ch = box.clientHeight || cw * c.height / c.width;
    const s = o.fit === "cover" ? Math.max(cw / c.width, ch / c.height) : Math.min(cw / c.width, ch / c.height);
    frame.style.transform = `translate(${(cw - c.width * s) / 2 - c.x * s}px, ${(ch - c.height * s) / 2 - c.y * s}px) scale(${s})`;
  }
  // live pieces: the page keeps its own clock; it runs only while playing, on screen and in a visible tab
  let sentRun: boolean | null = null;
  function syncLive() {
    if (!info?.live || !bridgeReady || destroyed) return;
    const on = playing && visible && !document.hidden;
    if (on !== sentRun) { sentRun = on; frame.contentWindow?.postMessage({ mm: 1, type: "run", on }, "*"); }
  }
  const norm = (f: number) => {
    const n = info ? info.frames : Infinity;
    if (!isFinite(n)) return Math.max(0, Math.floor(f));
    return loop ? ((Math.floor(f) % n) + n) % n : Math.max(0, Math.min(n - 1, Math.floor(f)));
  };
  function send(f: number): Promise<void> {
    if (f !== shown) { shown = f; o.onFrame?.(f); }
    if (destroyed) return Promise.resolve();
    if (!bridgeReady) return ready.then(() => firstDrawn); // the ready handler draws the latest position
    const s = ++seq;
    frame.contentWindow?.postMessage({ mm: 1, type: "frame", frame: f, seq: s }, "*");
    return new Promise(resolve => waiting.push({ seq: s, resolve }));
  }

  const running = () => playing && visible && !document.hidden && bridgeReady && !destroyed;
  function schedule() { if (info?.live) { syncLive(); return; } if (!raf && running()) { last = 0; raf = requestAnimationFrame(tick); } }
  function tick(ts: number) {
    raf = 0;
    if (!running() || !info) return;
    if (last) pos += Math.min(ts - last, 100) / 1000 * info.fps * speed; // a long stall resumes where it was instead of jumping ahead
    last = ts;
    if (pos >= info.frames) {
      if (loop) pos %= info.frames;
      else { pos = info.frames - 1; send(info.frames - 1); playing = wanted = false; o.onEnd?.(); return; }
    }
    if (Math.floor(pos) !== shown) send(Math.floor(pos));
    raf = requestAnimationFrame(tick);
  }

  function onMessage(e: MessageEvent) {
    const m = e.data as BridgeMessage;
    if (e.source !== frame.contentWindow || !m || m.mm !== 1) return;
    if (m.type === "ready" && m.live) {
      setInfo({ fps: m.fps || 60, frames: 0, width: m.width!, height: m.height!, title: m.title, live: true, viewport: m.viewport, crop: m.crop });
      bridgeReady = true; frame.style.visibility = "visible";
      resolveReady(info!); o.onReady?.(info!);
      if (wanted) player.play(); else syncLive();
    } else if (m.type === "input") {
      if (posterHold) { posterHold = false; player.play(); }
    } else if (m.type === "ready") {
      setInfo({ fps: m.fps!, frames: m.frames!, width: m.width!, height: m.height!, title: m.title, poster: m.poster });
      if (reduce && !wanted && shown < 0) pos = o.posterFrame ?? m.poster ?? pos;
      bridgeReady = true; pos = norm(pos); shown = -1;
      firstDrawn = send(Math.floor(pos)).then(() => { frame.style.visibility = "visible"; });
      resolveReady(info!); o.onReady?.(info!);
      if (wanted) player.play();
    } else if (m.type === "drawn") {
      for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].seq <= (m.seq ?? 0)) { waiting[i].resolve(); waiting.splice(i, 1); }
    } else if (m.type === "error") {
      o.onError?.(m.message || "error"); rejectReady(new Error(m.message));
    }
  }
  addEventListener("message", onMessage);

  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(layout) : null;
  ro?.observe(box);
  const io = o.pauseOffscreen && typeof IntersectionObserver === "function"
    ? new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; schedule(); }) : null;
  io?.observe(box);
  const onVis = () => schedule();
  document.addEventListener("visibilitychange", onVis);

  // On the same origin the size is known before the piece loads, so the page does not jump; the bridge's own report wins if it differs.
  // (A piece on another origin has no CORS headers by default: skip the fetch rather than log an error; the bridge reports the size.)
  if (new URL(folder, location.href).origin === location.origin) fetch(folder + "motion.json").then(r => (r.ok ? r.json() : null)).then((i: MotionInfo | null) => { if (i && !info && !destroyed) setInfo(i); }).catch(() => undefined);
  label();
  frame.src = page + (page.includes("?") ? "&" : "?") + "t=0&embed=1";

  const player: MotionPlayer = {
    ready,
    get info() { return info; },
    get frame() { return Math.max(0, shown); },
    get playing() { return playing; },
    play() {
      wanted = true;
      if (!bridgeReady || destroyed) return;
      if (!info?.live && !loop && info && Math.floor(pos) >= info.frames - 1) pos = 0;
      playing = true; posterHold = false; schedule();
    },
    pause() { wanted = playing = posterHold = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } syncLive(); },
    toggle() { if (playing) player.pause(); else player.play(); },
    seek(f: number) { if (info?.live) return Promise.resolve(); pos = norm(f); return send(Math.floor(pos)); },
    seekTime(sec: number) { return info ? player.seek(Math.round(sec * info.fps)) : ready.then(i => player.seek(Math.round(sec * i.fps))); },
    setSpeed(s: number) { if (s > 0) speed = s; },
    setLoop(l: boolean) { loop = l; },
    destroy() {
      destroyed = true; player.pause();
      removeEventListener("message", onMessage); document.removeEventListener("visibilitychange", onVis);
      ro?.disconnect(); io?.disconnect();
      waiting.splice(0).forEach(w => w.resolve());
      box.remove();
    },
  };
  return player;
}

/** Registers <motion-clip src="..." [paused] [loop="false"] [speed="0.5"] [fit="cover"] [interactive | interactive="false"] [label="..."]>. */
export function defineMotionElement(tag = "motion-clip"): void {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  customElements.define(tag, class extends HTMLElement {
    player: MotionPlayer | null = null;
    connectedCallback() {
      if (!this.style.display) this.style.display = "block";
      const a = (k: string) => this.getAttribute(k);
      this.player = mountMotion(this, {
        src: a("src") || "",
        autoplay: !this.hasAttribute("paused"),
        loop: a("loop") !== "false",
        speed: a("speed") ? Number(a("speed")) : 1,
        fit: (a("fit") as MotionOptions["fit"]) || "aspect",
        interactive: a("interactive") === "false" ? false : this.hasAttribute("interactive") ? true : undefined,
        label: a("label") || undefined,
      });
    }
    disconnectedCallback() { this.player?.destroy(); this.player = null; }
  });
}
