import type { Drone, Light, Project, Vec3 } from "./types";
export const curve = (t: number, e: string) =>
  e === "step" ? 0 : e === "smooth" ? t * t * (3 - 2 * t) : t;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function colorMix(a: string, b: string, t: number) {
  const n = (s: string, k: number) =>
    parseInt(s.slice(1 + k * 2, 3 + k * 2), 16);
  return (
    "#" +
    [0, 1, 2]
      .map((k) =>
        Math.round(mix(n(a, k), n(b, k), t))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function bracket<T extends { time: number }>(
  keys: T[],
  time: number,
): [T, T, number] | null {
  if (!keys.length) return null;
  if (time <= keys[0].time) return [keys[0], keys[0], 0];
  for (let i = 1; i < keys.length; i++)
    if (time < keys[i].time)
      return [
        keys[i - 1],
        keys[i],
        (time - keys[i - 1].time) / (keys[i].time - keys[i - 1].time),
      ];
  const end = keys[keys.length - 1];
  return [end, end, 0];
}
export function positionAt(p: Project, id: string, time: number): Vec3 {
  const b = bracket(p.frames, time);
  if (!b) return [0, 0, 0];
  const [a, c, t] = b,
    u = curve(t, a.easing);
  return a.positions[id].map((v, i) => mix(v, c.positions[id][i], u)) as Vec3;
}
export function lightAt(d: Drone, time: number): Light {
  const b = bracket(d.lights, time);
  if (!b || time < d.lights[0].time) return { ...d.light };
  const [a, c, t] = b,
    u = curve(t, a.easing);
  return {
    on: a.on,
    color: colorMix(a.color, c.color, u),
    brightness: mix(a.brightness, c.brightness, u),
  };
}
export function closePairs(positions: Vec3[], distance: number) {
  const flagged = new Set<number>();
  let pairs = 0;
  const cells = new Map<string, number[]>();
  if (distance <= 0) return { flagged, pairs };
  positions.forEach((p, i) => {
    const c = p.map((v) => Math.floor(v / distance));
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const near = cells.get(`${c[0] + x},${c[1] + y},${c[2] + z}`) || [];
          for (const j of near)
            if (
              p.reduce((sum, v, k) => sum + (v - positions[j][k]) ** 2, 0) <
              distance ** 2
            ) {
              flagged.add(i);
              flagged.add(j);
              pairs++;
            }
        }
    const key = c.join(",");
    const list = cells.get(key) || [];
    list.push(i);
    cells.set(key, list);
  });
  return { flagged, pairs };
}
// Only this mutable clock advances each render. Project data is never mutated by playback.
export const clock = { time: 0, playing: false, stopAt: null as number | null };
export function advance(p: Project, delta: number) {
  if (!clock.playing) return;
  clock.time += Math.max(0, delta) * p.animation.speed;
  if (clock.stopAt !== null && clock.time >= clock.stopAt) {
    clock.time = clock.stopAt;
    clock.playing = false;
    clock.stopAt = null;
    return;
  }
  if (clock.time >= p.animation.duration) {
    if (p.animation.loop) clock.time %= p.animation.duration;
    else {
      clock.time = p.animation.duration;
      clock.playing = false;
    }
  }
}
