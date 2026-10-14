// Motionmaker web player: plays a piece exported by export-web.mjs live on any page, frame-exact.
// The piece runs in an iframe (its CSS and globals cannot clash with the page); this side owns the clock and asks for
// whole frames, so frame n on the website is the same picture as frame n of the rendered video.
//
//   import { mountMotion } from "./motion-player";
//   const player = mountMotion(document.querySelector("#hero")!, { src: "/motions/launch/" });
//   player.pause(); await player.seek(120); player.play();
//
// Or, with no build step: defineMotionElement() and then <motion-clip src="/motions/launch/"></motion-clip>.
export function mountMotion(host, options) {
    const set = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)); // an explicit undefined keeps the default
    const o = { autoplay: true, loop: true, speed: 1, startFrame: 0, fit: "aspect", reducedMotion: "poster", pauseOffscreen: true, ...set };
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
    let info = null, bridgeReady = false, destroyed = false;
    let pos = Math.max(0, o.startFrame), shown = -1, playing = false, wanted = o.autoplay && !reduce;
    let visible = true, raf = 0, last = 0, seq = 0, speed = o.speed > 0 ? o.speed : 1, loop = o.loop;
    let posterHold = reduce && o.autoplay; // reduced motion: hold still until the visitor touches a live piece
    const waiting = [];
    let firstDrawn = Promise.resolve();
    let resolveReady, rejectReady;
    const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
    ready.catch(() => undefined);
    const label = () => { const l = o.label || info?.title || "animation"; box.setAttribute("aria-label", l); frame.title = l; };
    function setInfo(i) {
        info = i;
        if (o.fit === "aspect")
            box.style.aspectRatio = `${i.width} / ${i.height}`;
        const vp = i.viewport || { width: i.width, height: i.height };
        frame.style.width = vp.width + "px";
        frame.style.height = vp.height + "px";
        const interactive = o.interactive ?? !!i.live;
        frame.style.pointerEvents = interactive ? "" : "none";
        if (interactive) {
            frame.removeAttribute("tabindex");
            frame.removeAttribute("aria-hidden");
        }
        else {
            frame.setAttribute("tabindex", "-1");
            frame.setAttribute("aria-hidden", "true");
        }
        label();
        layout();
    }
    function layout() {
        if (!info)
            return;
        const c = info.crop || { x: 0, y: 0, width: info.width, height: info.height };
        const cw = box.clientWidth, ch = box.clientHeight || cw * c.height / c.width;
        const s = o.fit === "cover" ? Math.max(cw / c.width, ch / c.height) : Math.min(cw / c.width, ch / c.height);
        frame.style.transform = `translate(${(cw - c.width * s) / 2 - c.x * s}px, ${(ch - c.height * s) / 2 - c.y * s}px) scale(${s})`;
    }
    // live pieces: the page keeps its own clock; it runs only while playing, on screen and in a visible tab
    let sentRun = null;
    function syncLive() {
        if (!info?.live || !bridgeReady || destroyed)
            return;
        const on = playing && visible && !document.hidden;
        if (on !== sentRun) {
            sentRun = on;
            frame.contentWindow?.postMessage({ mm: 1, type: "run", on }, "*");
        }
    }
    const norm = (f) => {
        const n = info ? info.frames : Infinity;
        if (!isFinite(n))
            return Math.max(0, Math.floor(f));
        return loop ? ((Math.floor(f) % n) + n) % n : Math.max(0, Math.min(n - 1, Math.floor(f)));
    };
    function send(f) {
        if (f !== shown) {
            shown = f;
            o.onFrame?.(f);
        }
        if (destroyed)
            return Promise.resolve();
        if (!bridgeReady)
            return ready.then(() => firstDrawn); // the ready handler draws the latest position
        const s = ++seq;
        frame.contentWindow?.postMessage({ mm: 1, type: "frame", frame: f, seq: s }, "*");
        return new Promise(resolve => waiting.push({ seq: s, resolve }));
    }
    const running = () => playing && visible && !document.hidden && bridgeReady && !destroyed;
    function schedule() { if (info?.live) {
        syncLive();
        return;
    } if (!raf && running()) {
        last = 0;
        raf = requestAnimationFrame(tick);
    } }
    function tick(ts) {
        raf = 0;
        if (!running() || !info)
            return;
        if (last)
            pos += Math.min(ts - last, 100) / 1000 * info.fps * speed; // a long stall resumes where it was instead of jumping ahead
        last = ts;
        if (pos >= info.frames) {
            if (loop)
                pos %= info.frames;
            else {
                pos = info.frames - 1;
                send(info.frames - 1);
                playing = wanted = false;
                o.onEnd?.();
                return;
            }
        }
        if (Math.floor(pos) !== shown)
            send(Math.floor(pos));
        raf = requestAnimationFrame(tick);
    }
    function onMessage(e) {
        const m = e.data;
        if (e.source !== frame.contentWindow || !m || m.mm !== 1)
            return;
        if (m.type === "ready" && m.live) {
            setInfo({ fps: m.fps || 60, frames: 0, width: m.width, height: m.height, title: m.title, live: true, viewport: m.viewport, crop: m.crop });
            bridgeReady = true;
            frame.style.visibility = "visible";
            resolveReady(info);
            o.onReady?.(info);
            if (wanted)
                player.play();
            else
                syncLive();
        }
        else if (m.type === "input") {
            if (posterHold) {
                posterHold = false;
                player.play();
            }
        }
        else if (m.type === "ready") {
            setInfo({ fps: m.fps, frames: m.frames, width: m.width, height: m.height, title: m.title, poster: m.poster });
            if (reduce && !wanted && shown < 0)
                pos = o.posterFrame ?? m.poster ?? pos;
            bridgeReady = true;
            pos = norm(pos);
            shown = -1;
            firstDrawn = send(Math.floor(pos)).then(() => { frame.style.visibility = "visible"; });
            resolveReady(info);
            o.onReady?.(info);
            if (wanted)
                player.play();
        }
        else if (m.type === "drawn") {
            for (let i = waiting.length - 1; i >= 0; i--)
                if (waiting[i].seq <= (m.seq ?? 0)) {
                    waiting[i].resolve();
                    waiting.splice(i, 1);
                }
        }
        else if (m.type === "error") {
            o.onError?.(m.message || "error");
            rejectReady(new Error(m.message));
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
    if (new URL(folder, location.href).origin === location.origin)
        fetch(folder + "motion.json").then(r => (r.ok ? r.json() : null)).then((i) => { if (i && !info && !destroyed)
            setInfo(i); }).catch(() => undefined);
    label();
    frame.src = page + (page.includes("?") ? "&" : "?") + "t=0&embed=1";
    const player = {
        ready,
        get info() { return info; },
        get frame() { return Math.max(0, shown); },
        get playing() { return playing; },
        play() {
            wanted = true;
            if (!bridgeReady || destroyed)
                return;
            if (!info?.live && !loop && info && Math.floor(pos) >= info.frames - 1)
                pos = 0;
            playing = true;
            posterHold = false;
            schedule();
        },
        pause() { wanted = playing = posterHold = false; if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        } syncLive(); },
        toggle() { if (playing)
            player.pause();
        else
            player.play(); },
        seek(f) { if (info?.live)
            return Promise.resolve(); pos = norm(f); return send(Math.floor(pos)); },
        seekTime(sec) { return info ? player.seek(Math.round(sec * info.fps)) : ready.then(i => player.seek(Math.round(sec * i.fps))); },
        setSpeed(s) { if (s > 0)
            speed = s; },
        setLoop(l) { loop = l; },
        destroy() {
            destroyed = true;
            player.pause();
            removeEventListener("message", onMessage);
            document.removeEventListener("visibilitychange", onVis);
            ro?.disconnect();
            io?.disconnect();
            waiting.splice(0).forEach(w => w.resolve());
            box.remove();
        },
    };
    return player;
}
/** Registers <motion-clip src="..." [paused] [loop="false"] [speed="0.5"] [fit="cover"] [interactive | interactive="false"] [label="..."]>. */
export function defineMotionElement(tag = "motion-clip") {
    if (typeof customElements === "undefined" || customElements.get(tag))
        return;
    customElements.define(tag, class extends HTMLElement {
        constructor() {
            super(...arguments);
            this.player = null;
        }
        connectedCallback() {
            if (!this.style.display)
                this.style.display = "block";
            const a = (k) => this.getAttribute(k);
            this.player = mountMotion(this, {
                src: a("src") || "",
                autoplay: !this.hasAttribute("paused"),
                loop: a("loop") !== "false",
                speed: a("speed") ? Number(a("speed")) : 1,
                fit: a("fit") || "aspect",
                interactive: a("interactive") === "false" ? false : this.hasAttribute("interactive") ? true : undefined,
                label: a("label") || undefined,
            });
        }
        disconnectedCallback() { this.player?.destroy(); this.player = null; }
    });
}
