// Tiny synth player for the globe theme. Loaded only when the globe is framed (dynamic import from viewer.js).
// Data: `public/audio/indy-theme.bin`, 5 s to 65 s of the supplied MIDI file as 13 voices of notes (see D-087).
// Layout: byte V, then per voice: type byte, varint count, then per note varint dt (10 ms from the previous start), varint duration (10 ms), pitch byte.
const LEN = 60, FADE = 1.5, LOOK = 1.5;

function decode(buf) {
  const b = new Uint8Array(buf); let i = 0;
  const vi = () => { let n = 0, s = 0, x; do { x = b[i++]; n |= (x & 127) << s; s += 7; } while (x & 128); return n; };
  const voices = [];
  for (let v = b[i++]; v > 0; v--) {
    const type = b[i++], n = vi(), notes = []; let t = 0;
    for (let k = 0; k < n; k++) { t += vi(); notes.push([t / 100, vi() / 100, b[i++]]); }
    voices.push({ type, notes });
  }
  return voices;
}

export function playGlobeTheme(ctx, buf, onEnd) {
  const voices = decode(buf), t0 = ctx.currentTime + 0.15;
  const out = ctx.createGain(), comp = ctx.createDynamicsCompressor();
  out.connect(comp); comp.connect(ctx.destination);
  out.gain.setValueAtTime(0.55, t0 + LEN - FADE); out.gain.linearRampToValueAtTime(0, t0 + LEN);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = noise.getChannelData(0);
  for (let k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
  const hz = p => 440 * 2 ** ((p - 69) / 12);

  // One envelope-shaped gain node per note; `peak` level, `a` attack, `d` seconds until it has died away.
  const env = (t, dur, peak, a, rel) => {
    const g = ctx.createGain(), end = t + Math.max(dur, a + 0.05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, end); g.gain.linearRampToValueAtTime(0, end + rel);
    g.connect(out); return [g, end + rel];
  };
  const osc = (type, f, t, stop, dest, detune = 0) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(stop); return o;
  };
  const lp = (f, dest, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = f; n.Q.value = q; n.connect(dest); return n; };
  const burst = (t, len, type, f, peak) => {
    const s = ctx.createBufferSource(), n = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; n.type = type; n.frequency.value = f; s.connect(n); n.connect(g); g.connect(out);
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.start(t); s.stop(t + len);
  };
  const play = {
    0: (t, d, p) => { const [g, e] = env(t, d, 0.2, 0.03, 0.08); osc('sawtooth', hz(p), t, e, lp(650, g)); },              // tuba
    1: (t, d, p) => { const [g, e] = env(t, Math.min(d, 0.25), 0.2, 0.01, 0.12); osc('sawtooth', hz(p), t, e, lp(1800, g)); }, // orchestra hit
    2: (t, d, p) => { const [g, e] = env(t, d, 0.07, 0.07, 0.12), f = lp(2400, g); osc('sawtooth', hz(p), t, e, f, -7); osc('sawtooth', hz(p), t, e, f, 7); }, // strings
    3: (t, d, p) => { const [g, e] = env(t, d, 0.13, 0.02, 0.06), f = lp(2600, g); osc('sawtooth', hz(p), t, e, f); osc('sawtooth', hz(p - 12), t, e, f, 4); }, // trumpet, horn and trombone together
    4: (t, d, p) => { const [g, e] = env(t, 0.1, 0.55, 0.005, 0.5), o = osc('sine', hz(p) * 1.15, t, e, g); o.frequency.exponentialRampToValueAtTime(hz(p), t + 0.08); }, // timpani
    5: (t, d, p) => { const [g, e] = env(t, d, 0.09, 0.05, 0.1); osc('sawtooth', hz(p), t, e, lp(1400, g)); },             // second horn
    6: t => burst(t, 0.12, 'highpass', 1500, 0.16),                                                                      // snare
    7: t => burst(t, 0.9, 'highpass', 6000, 0.08),                                                                       // cymbal
    8: (t, d, p) => { const [g, e] = env(t, 0.05, 0.6, 0.003, 0.25), o = osc('sine', 120, t, e, g); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); }, // bass drum
    9: (t, d, p) => { const [g, e] = env(t, 0.03, 0.2, 0.003, 0.18); osc('triangle', hz(p), t, e, g); },                  // pizzicato
  };
  // Look-ahead scheduling: only the notes of the next second or so exist as audio nodes.
  const cursor = voices.map(() => 0);
  let timer = 0, done = false;
  const pump = () => {
    const horizon = ctx.currentTime - t0 + LOOK;
    voices.forEach((v, vi) => {
      for (; cursor[vi] < v.notes.length && v.notes[cursor[vi]][0] < horizon; cursor[vi]++) {
        const [s, d, p] = v.notes[cursor[vi]]; if (s < LEN) play[v.type]?.(t0 + s, d, p);
      }
    });
    if (ctx.currentTime - t0 > LEN + 0.3) stop(true);
  };
  function stop(ended) {
    if (done) return; done = true; clearInterval(timer);
    try { out.gain.cancelScheduledValues(0); out.gain.setValueAtTime(out.gain.value, ctx.currentTime); out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); } catch { /* already closed */ }
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } if (ended) onEnd?.(); }, 250);
  }
  pump(); timer = setInterval(pump, 400);
  return { stop: () => stop(false) };
}
