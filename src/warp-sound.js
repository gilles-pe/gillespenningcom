// Sound for the Enterprise warp flight: a departure sound that builds up to the jump, and an arrival sound that
// begins when the ship drops out of warp and rings out over the landing. Loaded only when the flight is started.
const FILES = ['audio/start.mp3', 'audio/landing.mp3'];
export const ARRIVE_AT = 3.7;   // seconds into the flight (the ship re-appears at about 4.0 s, lands at 7.45 s)
export const LANDING_END = 7.5, LANDING_FADE = 0.9;   // the arrival sound is faded out so that it is silent when the ship has landed
const LEVEL = 0.8, FADE = 0.25;

// Fetch both files as raw bytes (no audio context needed, so it can run before the click is complete).
export const fetchWarpSound = base => Promise.all(FILES.map(f => fetch(`${base}${f}`).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })));

const isDecoded = item => Boolean(item && typeof item.duration === 'number' && typeof item.getChannelData === 'function');

// Decodes both audio tracks once per context; already-decoded AudioBuffers pass straight through.
export function decodeWarpSound(ctx, data) {
  const decode = item => isDecoded(item)
    ? Promise.resolve(item)
    : new Promise((ok, no) => { const p = ctx.decodeAudioData(item.slice(0), ok, no); p?.catch?.(no); });
  return Promise.all(data.map(decode));
}

// Plays both sounds against the flight clock: startedAt is performance.now() when the flight started. The flight clock is
// the page clock, not the audio clock, because an audio context may start running a moment after it was created.
// If decoding finishes late, the sounds are joined at the position they would have reached, so they stay in sync.
export function playWarpSound(ctx, data, startedAt) {
  const master = ctx.createGain(); master.gain.value = LEVEL; master.connect(ctx.destination);
  let stopped = false, live = [];
  const schedule = (buffer, at, end = Infinity, fade = 0) => {
    const elapsed = (performance.now() - startedAt) / 1000, delay = at - elapsed, now = ctx.currentTime;
    const stopIn = Math.min(end - elapsed, delay + buffer.duration);
    if (stopIn <= 0) return;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    if (fade) {
      // Fade out so that the sound ends together with the landing instead of ringing on after it.
      const g = ctx.createGain(); src.connect(g); g.connect(master);
      g.gain.setValueAtTime(1, now);
      g.gain.setValueAtTime(1, now + Math.max(0, stopIn - fade)); g.gain.linearRampToValueAtTime(0, now + stopIn);
    } else src.connect(master);
    if (delay >= 0) src.start(now + delay); else src.start(now, -delay);
    if (stopIn < delay + buffer.duration) src.stop(now + stopIn);
    live.push(src);
    src.onended = () => { live = live.filter(s => s !== src); if (!live.length && !stopped) { stopped = true; ctx.close?.(); } };
  };
  decodeWarpSound(ctx, data).then(([start, landing]) => {
    if (stopped) return;
    schedule(start, 0); schedule(landing, ARRIVE_AT, LANDING_END, LANDING_FADE);
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
