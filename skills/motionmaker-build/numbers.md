# Motion numbers (starting points)

Easing (cubic-bezier): enter `0.16,1,0.3,1` (ease-out-expo) | move `0.76,0,0.24,1` | exit `0.7,0,0.84,0` | pop `0.34,1.56,0.64,1`. Linear only for rotation, progress bars, loop phase. Camera moves use the softest curves (ease-in-out-quart).

Springs: ratio = d / (2*sqrt(k*m)). 1.0 no bounce (UI, text); 0.7-0.85 premium; 0.4-0.6 playful; <0.3 cartoon. Position/size may bounce, opacity/color never do. Remotion default = 0.5; react-spring default = 1.0.

Durations: UI feedback 100-200 ms; UI moves 200-500 ms; hero reveal 600-900 ms; exits 40-50% shorter. At 24 fps 1 frame ~ 42 ms (400 ms = 10 f, 750 ms = 18 f).
Stagger: letters 1-2 frames; words 60-120 ms; list items 40-80 ms; next element starts at 30-50% of previous.
Beat grid: frames per beat = fps*60/BPM (120 BPM @24 = 12; @30 = 15). Compute each beat from time and round, never add a rounded value repeatedly. Cut on the beat, change layout on the bar (4 beats).
Holds: 0.3 s per word + 0.5 s; 2% slow push.
Parallax speeds: 1.0 / 0.5 / 0.2. Contrast >= 4.5:1 on every frame; flash <= 3/s.
Exaggeration: push key poses 10-30% further than feels right (feed shrinks everything).
Five animation principles in frames: anticipation (3-frame wind-up), squash & stretch (volume preserving), overlapping action (parts lag), follow-through (settle past the stop), arcs (no straight paths).
