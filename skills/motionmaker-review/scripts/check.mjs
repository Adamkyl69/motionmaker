// Pre-export checks. usage: node check.mjs <anim.html> <seconds> <fps> [--size WxH]
// 1) source has no clock/unseeded randomness  2) frame renders identically twice (determinism)
// 3) frame N-1 differs from frame 0 (no doubled seam frame) 4) page throws no errors
import { openAnim } from "../../motionmaker-build/scripts/browser.mjs";
import { readFileSync } from "node:fs";
const a = process.argv.slice(2);
const [file, secs, fps] = [a[0], +a[1], +a[2]];
const si = a.indexOf("--size"), sizeArg = si > -1 ? a[si + 1] : "600x600", [W, H] = sizeArg === "auto" ? ["auto", "auto"] : sizeArg.split("x").map(Number);
const N = Math.round(secs * fps), res = [];
const ok = (name, pass, detail = "") => { res.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const src = readFileSync(file, "utf8");
const banned = [/Date\.now\(/, /new Date\(/, /performance\.now\(/, /Math\.random\(/].filter(r => r.test(src.replace(/requestAnimationFrame[\s\S]*?\}\)\(0\);/, "")));
ok("no clock / unseeded random in source (live-preview rAF loop ignored)", banned.length === 0, banned.map(String).join(" "));
const { page, errors: errs, close } = await openAnim(file, W, H, { fps });
const shot = async n => { await page.evaluate(n => window.renderFrame(n), n); return page.screenshot(); };
const mid = Math.floor(N / 2);
const m1 = await shot(mid); await shot(3); const m2 = await shot(mid);
ok(`frame ${mid} renders identically twice (determinism)`, m1.equals(m2));
const f0 = await shot(0), fl = await shot(N - 1);
ok(`frame ${N - 1} differs from frame 0 (no duplicated seam frame)`, !f0.equals(fl));
ok("page errors", errs.length === 0, errs.join("; "));
await close();
process.exit(res.every(Boolean) ? 0 : 1);
