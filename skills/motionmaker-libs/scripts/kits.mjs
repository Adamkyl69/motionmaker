// Shared helpers: where the kit cache is and how to find an installed package (kit cache first, then ./node_modules).
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
export const KITS = path.resolve(process.env.MOTIONMAKER_KITS || path.join(os.homedir(), ".cache", "motionmaker", "kits"));
export function findPkg(name) {
  for (const r of [path.join(KITS, "node_modules"), process.env.MOTION_VENDOR_SRC, path.join(process.cwd(), "node_modules")].filter(Boolean))
    if (existsSync(path.join(r, name, "package.json"))) return path.join(r, name);
  return null;
}
export const need = (name, group) => { const p = findPkg(name); if (!p) { console.error(`${name} is not installed. Run: node ${path.join(path.dirname(new URL(import.meta.url).pathname), "lib.mjs")} setup ${group}`); process.exit(3); } return p; };
