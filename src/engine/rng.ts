export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function shuffleInPlace<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = pickInt(rng, i + 1);
    const tmp = items[i];
    items[i] = items[j] as T;
    items[j] = tmp as T;
  }
}

export function pickWeightedIndex(rng: Rng, weights: number[]): number {
  if (weights.length === 0) throw new Error("pickWeightedIndex: empty weights");
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return pickInt(rng, weights.length);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

export function takeWeighted<T>(
  rng: Rng,
  items: T[],
  count: number,
  weightOf: (item: T) => number,
): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length) {
    const idx = pickWeightedIndex(
      rng,
      pool.map((item) => weightOf(item)),
    );
    const [next] = pool.splice(idx, 1);
    if (next !== undefined) picked.push(next);
  }
  return picked;
}
