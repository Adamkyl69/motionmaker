// A starter scene in Remotion's own idiom: everything is a function of useCurrentFrame() (frame-exact by design), springs and interpolate for
// motion, random(seed) for anything random. Replace it with the piece; keep the rules: no Math.random, no Date, no timers, no network at render.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";

export type MainProps = { width: number; height: number; fps: number; frames: number; text: string; bg: string; fg: string; accent: string };

export const Main: React.FC<MainProps> = ({ text, bg, fg, accent }) => {
  const f = useCurrentFrame(), { fps, durationInFrames, width, height } = useVideoConfig();
  const words = text.split(" "), size = Math.min(width, height) * Math.min(0.14, 1.6 / Math.max(6, text.length));
  const out = interpolate(f, [durationInFrames - 12, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar = spring({ frame: f - 6 - words.length * 4, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: bg, alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {Array.from({ length: 14 }, (_, i) => {   // drifting dots: seeded with random(), a pure function of the frame
        const x = random(`x${i}`) * width, y = random(`y${i}`) * height, r = 4 + random(`r${i}`) * 10, dy = Math.sin((f / fps) * 1.2 + i) * 12;
        return <div key={i} style={{ position: "absolute", left: x, top: y + dy, width: r, height: r, borderRadius: r, background: accent, opacity: 0.25 }} />;
      })}
      <div style={{ display: "flex", gap: size * 0.28, opacity: out, flexWrap: "wrap", justifyContent: "center", maxWidth: width * 0.86 }}>
        {words.map((w, i) => {
          const s = spring({ frame: f - i * 4, fps, config: { damping: 12, stiffness: 120 } });
          return <span key={i} style={{ color: fg, fontSize: size, fontWeight: 800, letterSpacing: "-0.02em", transform: `translateY(${(1 - s) * size * 0.6}px)`, opacity: s }}>{w}</span>;
        })}
      </div>
      <div style={{ position: "absolute", top: height / 2 + size * 0.8, height: Math.max(4, size * 0.08), width: width * 0.22 * bar, background: accent, opacity: out }} />
    </AbsoluteFill>
  );
};
