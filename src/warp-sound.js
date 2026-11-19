// Sound for the Enterprise warp flight: a departure sound that builds up to the jump, and an arrival sound that
// begins when the ship drops out of warp and rings out over the landing. Loaded only when the flight is started.
const FILES = ['audio/start.mp3', 'audio/landing.mp3'];
export const ARRIVE_AT = 3.7;   // seconds into the flight (the ship re-appears at about 4.0 s, lands at 7.45 s)
const LEVEL = 0.8, FADE = 0.25;

// Fetch both files as raw bytes (no audio context needed, so it can run before the click is complete).
export const fetchWarpSound = base => Promise.all(FILES.map(f => fetch(`${base}${f}`).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })));

// Plays both sounds against the flight clock: startedAt is performance.now() when the flight started. The flight clock is
// the page clock, not the audio clock, because an audio context may start running a moment after it was created.
// If decoding finishes late, the sounds are joined at the position they would have reached, so they stay in sync.
export function playWarpSound(ctx, data, startedAt) {
  const master = ctx.createGain(); master.gain.value = LEVEL; master.connect(ctx.destination);
  let stopped = false, live = [];
  const decode = bytes => new Promise((ok, no) => { const p = ctx.decodeAudioData(bytes.slice(0), ok, no); p?.catch?.(no); });
  const schedule = (buffer, at) => {
    const delay = at - (performance.now() - startedAt) / 1000, now = ctx.currentTime;
    if (delay + buffer.duration <= 0) return;
    const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(master);
    if (delay >= 0) src.start(now + delay); else src.start(now, -delay);
    live.push(src);
    src.onended = () => { live = live.filter(s => s !== src); if (!live.length && !stopped) { stopped = true; ctx.close?.(); } };
  };
  Promise.all(data.map(decode)).then(([start, landing]) => {
    if (stopped) return;
    schedule(start, 0); schedule(landing, ARRIVE_AT);
    if (!live.length) { stopped = true; ctx.close?.(); }
  }).catch(() => { if (!stopped) { stopped = true; ctx.close?.(); } });
  return {
    stop() {
      if (stopped) return; stopped = true;
      try { master.gain.setTargetAtTime(0, ctx.currentTime, FADE / 4); } catch {}
      setTimeout(() => { for (const s of live) { try { s.stop(); } catch {} } ctx.close?.(); }, FADE * 1000);
    },
  };
}
