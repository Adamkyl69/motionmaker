// usage: node render.mjs anim.html 4 24   -> out/frames/f0000.png ...
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";
const [file, secs, fps] = [process.argv[2], +process.argv[3], +process.argv[4]];
const frames = secs * fps, dir = "out/frames";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
await page.goto(pathToFileURL(path.resolve(file)).href + "?t=0");
await page.evaluate(() => document.fonts.ready);
for (let n = 0; n < frames; n++) {            // frames 0..N-1, never N
  await page.evaluate(n => window.renderFrame(n), n);
  await page.screenshot({ path: `${dir}/f${String(n).padStart(4, "0")}.png` });
}
await browser.close();
console.log(`${frames} frames -> ${dir}`);
