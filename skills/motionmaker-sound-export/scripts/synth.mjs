// Synthesize a frame-synced soundtrack with the Web Audio API (OfflineAudioContext in headless Chromium). No samples.
// usage: node synth.mjs <events.json> <seconds> <fps> <out.wav> [--bed 0.02]
// events.json: [{ "frame": 12, "type": "tick|thud|whoosh|chime|pop|click", "gain": 1, "pitch": 1 }, ...]
// Each hit's attack PEAK lands exactly 1 frame after its picture frame (light beats sound). Swells (whoosh) peak there too,
// so they need ~5 frames of lead-in at 24 fps (event frame >= 5). A quiet pad "bed" keeps the mix alive.
// Output: mono 48 kHz 16-bit WAV (pre-normalization; run loudnorm.sh next).
import { launch } from "../../motionmaker-build/scripts/browser.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? +a[i+1] : d; };
const [evFile, secs, fps, out] = [a[0], +a[1], +a[2], a[3]];
if (!evFile || !secs || !fps || !out) { console.error("usage: node synth.mjs events.json seconds fps out.wav [--bed 0.02]"); process.exit(1); }
const events = JSON.parse(readFileSync(evFile, "utf8")), bed = opt("--bed", 0.02), SR = 48000;
const browser = await launch(), page = await browser.newPage();
await page.setContent("<html></html>");
const samples = await page.evaluate(async ({ events, secs, fps, bed, SR }) => {
  const ctx = new OfflineAudioContext(1, Math.round(secs * SR), SR), master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const env = (g, t, atk, dec, peak) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec); };
  const osc = (type, f0, f1, t, dur) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); return o; };
  const noise = () => { const b = ctx.createBuffer(1, SR, SR), d = b.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; } const n = ctx.createBufferSource(); n.buffer = b; return n; }; // seeded noise
  const ATK = 0.004;                                    // 4 ms attack: peak time == hit time + ATK (compensated below)
  const voices = {
    tick:  (t, g, p) => { const o = osc("triangle", 1800*p, 900*p, t, 0.08), v = ctx.createGain(); env(v, t, ATK, 0.07, 0.8*g); o.connect(v).connect(master); o.start(t); o.stop(t + 0.2); },
    click: (t, g, p) => { const n = noise(), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000*p; const v = ctx.createGain(); env(v, t, 0.002, 0.04, 0.7*g);
                          n.connect(f).connect(v).connect(master); n.start(t); n.stop(t + 0.1);
                          const o = osc("sine", 1400*p, 700*p, t, 0.05), ov = ctx.createGain(); env(ov, t, 0.002, 0.06, 0.7*g); o.connect(ov).connect(master); o.start(t); o.stop(t + 0.15); },   // noise tick + short tone: has body, so it survives compression
    pop:   (t, g, p) => { const o = osc("sine", 520*p, 190*p, t, 0.12), v = ctx.createGain(); env(v, t, ATK, 0.12, 0.7*g); o.connect(v).connect(master); o.start(t); o.stop(t + 0.3); },
    thud:  (t, g, p) => { const o = osc("sine", 140*p, 55*p, t, 0.35), v = ctx.createGain(); env(v, t, ATK, 0.4, 0.9*g); o.connect(v).connect(master); o.start(t); o.stop(t + 0.6); },
    whoosh:(t, g, p) => { const n = noise(), f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8; f.frequency.setValueAtTime(400*p, t); f.frequency.exponentialRampToValueAtTime(5000*p, t + 0.2);   // sweep ends exactly when the swell peaks
                          const v = ctx.createGain(); env(v, t, 0.2, 0.15, 0.45*g); n.connect(f).connect(v).connect(master); n.start(t); n.stop(t + 0.6); },
    chime: (t, g, p) => { [1, 2.76, 5.4].forEach((m, i) => { const o = osc("sine", 880*p*m, 0, t, 0), v = ctx.createGain(); env(v, t, ATK, 0.9 / (i + 1), 0.28*g / (i + 1)); o.connect(v).connect(master); o.start(t); o.stop(t + 1.2); }); },
  };
  for (const e of events) {                              // picture at frame f -> sound peak at frame f+1 (minus the voice's attack)
    const peak = (e.frame + 1) / fps, atk = e.type === "whoosh" ? 0.2 : e.type === "click" ? 0.002 : ATK;
    if (peak - atk < 0) { console.error(`WARNING: ${e.type} at frame ${e.frame} needs ${(atk*fps).toFixed(1)} frames of lead-in; it will start at t=0 and land early. Move it later.`); }
    voices[e.type](Math.max(0, peak - atk), e.gain ?? 1, e.pitch ?? 1);
  }
  if (bed > 0) { const v = ctx.createGain(); v.gain.value = bed*0.12; v.connect(master);          // soft two-note pad, fades in/out so the loop seam is silent-ish
    [220, 330].forEach((f, i) => { const o = osc("sine", f, 0, 0, 0); o.detune.value = i*5; o.connect(v); o.start(0); o.stop(secs); });
    v.gain.setValueAtTime(0, 0); v.gain.linearRampToValueAtTime(bed*0.12, 0.25); v.gain.setValueAtTime(bed*0.12, secs - 0.25); v.gain.linearRampToValueAtTime(0, secs); }
  const buf = await ctx.startRendering(); return Array.from(buf.getChannelData(0));
}, { events, secs, fps, bed, SR });
await browser.close();
const pcm = Buffer.alloc(44 + samples.length * 2); pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + samples.length*2, 4); pcm.write("WAVEfmt ", 8); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR*2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(samples.length*2, 40);
samples.forEach((s, i) => pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), 44 + i*2));
writeFileSync(out, pcm); console.log(`${out}: ${events.length} events, ${secs}s @ ${SR} Hz`);
