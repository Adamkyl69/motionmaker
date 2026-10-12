// Render ONLY the frames you ask for (review stills + short preview ranges), labeled by global frame number.
// usage: node stills.mjs <anim.html> <frames> [--size WxH] [--out out/stills]     frames: "0,18,42,60,119" or ranges "180-249" or mixed "0,18,195-210"
// Then: ffmpeg preview from a range:  ffmpeg -framerate 30 -start_number 180 -i out/stills/f%04d.png -pix_fmt yuv420p preview-180-249.mp4
import { openAnim } from "../../motionmaker-build/scripts/browser.mjs";
import { mkdirSync } from "node:fs";
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const [file, spec] = [a[0], a[1]]; const [W, H] = opt("--size", "1080x1080").split("x").map(Number), dir = opt("--out", "out/stills");
if (!file || !spec) { console.error('usage: node stills.mjs anim.html "0,18,42,195-210" [--size WxH] [--out dir]'); process.exit(1); }
const frames = spec.split(",").flatMap(s => { const [x, y] = s.split("-").map(Number); return y === undefined ? [x] : Array.from({ length: y - x + 1 }, (_, i) => x + i); });
mkdirSync(dir, { recursive: true });
const { page, errors, close } = await openAnim(file, W, H);
for (const f of frames) { await page.evaluate(f => window.renderFrame(f), f); await page.screenshot({ path: `${dir}/f${String(f).padStart(4, "0")}.png` }); }
await close(); if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exit(2); }
console.log(`${frames.length} stills -> ${dir}`);
