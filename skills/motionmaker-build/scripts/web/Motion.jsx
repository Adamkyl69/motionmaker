"use client";
// React wrapper for the Motionmaker web player. Works in Vite, Next.js (client component) and other React 18+ apps.
//
//   <Motion src="/motions/launch/" />
//   <Motion src="/motions/launch/" playing={inView} loop={false} onEnd={() => setDone(true)} ref={playerRef} />
//
// The ref is the MotionPlayer (play, pause, seek, seekTime, setSpeed, setLoop).
import { forwardRef, useEffect, useRef } from "react";
import { mountMotion } from "./motion-player";
function setRef(ref, value) {
    if (typeof ref === "function")
        ref(value);
    else if (ref)
        ref.current = value;
}
export const Motion = forwardRef(function Motion(props, ref) {
    const { className, style, playing, src, fit, interactive, label, reducedMotion, pauseOffscreen } = props;
    const host = useRef(null);
    const player = useRef(null);
    const latest = useRef(props);
    latest.current = props; // callbacks always see the latest props without remounting the piece
    useEffect(() => {
        const p = latest.current;
        const mounted = mountMotion(host.current, {
            src, fit, interactive, label, reducedMotion, pauseOffscreen,
            autoplay: p.playing ?? p.autoplay ?? true,
            loop: p.loop, speed: p.speed, startFrame: p.startFrame, posterFrame: p.posterFrame,
            onReady: i => latest.current.onReady?.(i),
            onFrame: f => latest.current.onFrame?.(f),
            onEnd: () => latest.current.onEnd?.(),
            onError: m => latest.current.onError?.(m),
        });
        player.current = mounted;
        setRef(ref, mounted);
        return () => { mounted.destroy(); player.current = null; setRef(ref, null); };
    }, [src, fit, interactive, label, reducedMotion, pauseOffscreen, ref]);
    useEffect(() => { if (props.speed !== undefined)
        player.current?.setSpeed(props.speed); }, [props.speed]);
    useEffect(() => { player.current?.setLoop(props.loop ?? true); }, [props.loop]);
    useEffect(() => {
        if (playing === undefined)
            return;
        if (playing)
            player.current?.play();
        else
            player.current?.pause();
    }, [playing]);
    // contain / cover fill the host box, so the host takes its parent's height; "aspect" sizes itself from the width
    return <div ref={host} className={className} style={fit === "contain" || fit === "cover" ? { height: "100%", ...style } : style}/>;
});
