/** Tres pitidos cortos (para temporizadores). Solo en el navegador. */
export function beep() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.45;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.4);
    }
  } catch {
    /* sin audio */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([300, 150, 300]);
}
