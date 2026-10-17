import type { Formation, FormationParams, Vec3 } from "./types";
export const defaultParams: FormationParams = {
  center: [0, 16, 0],
  width: 32,
  height: 28,
  radius: 18,
  spacing: 3,
  rotation: 0,
};
export function formation(
  type: Formation,
  count: number,
  p: FormationParams,
): Vec3[] {
  if (!Number.isInteger(count) || count < 1 || count > 500)
    throw new Error("數量必須是 1～500 的整數");
  const cols = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    let x = 0,
      y = 0,
      z = 0;
    if (type === "line") x = (i - (count - 1) / 2) * p.spacing;
    if (type === "grid") {
      x = (((i % cols) - (cols - 1) / 2) * p.width) / Math.max(1, cols - 1);
      z =
        ((Math.floor(i / cols) - (Math.ceil(count / cols) - 1) / 2) *
          p.height) /
        Math.max(1, Math.ceil(count / cols) - 1);
    }
    if (type === "circle") {
      x = Math.cos(a) * p.radius;
      z = Math.sin(a) * p.radius;
    }
    if (type === "helix") {
      x = Math.cos(a * 3) * p.radius;
      z = Math.sin(a * 3) * p.radius;
      y = (i / Math.max(1, count - 1) - 0.5) * p.height;
    }
    if (type === "sphere") {
      y = 1 - (2 * (i + 0.5)) / count;
      const r = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      x = Math.cos(theta) * r * p.radius;
      z = Math.sin(theta) * r * p.radius;
      y *= p.radius;
    }
    if (type === "heart") {
      x = (16 * Math.sin(a) ** 3 * p.width) / 32;
      y =
        ((13 * Math.cos(a) -
          5 * Math.cos(2 * a) -
          2 * Math.cos(3 * a) -
          Math.cos(4 * a)) *
          p.height) /
        30;
    }
    const r = (p.rotation * Math.PI) / 180;
    return [
      x * Math.cos(r) - z * Math.sin(r) + p.center[0],
      y + p.center[1],
      x * Math.sin(r) + z * Math.cos(r) + p.center[2],
    ];
  });
}
