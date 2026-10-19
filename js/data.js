// Synthetic trials for the illustrative demo. Zero drift on purpose: every curve is luck.
// The "winner" is picked the way an overfitted search picks it: best t-statistic of the lot.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTrials({ count = 24, steps = 96, seed = 1984 } = {}) {
  const rnd = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };
  const trials = [];
  for (let k = 0; k < count; k++) {
    const sigma = 0.8 + rnd() * 0.5;
    let v = 0;
    const path = [0];
    const rets = [];
    for (let i = 1; i < steps; i++) {
      const r = sigma * gauss();
      rets.push(r);
      v += r;
      path.push(v);
    }
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length);
    trials.push({ path, t: mean / sd });
  }
  let best = 0;
  trials.forEach((t, i) => { if (t.t > trials[best].t) best = i; });
  let lo = Infinity, hi = -Infinity;
  trials.forEach((t) => t.path.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }));
  return { trials, best, lo, hi, steps };
}
