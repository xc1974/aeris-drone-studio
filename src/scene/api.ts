import type { CameraKey, Vec3 } from "../core/types";
export type ShotMode = "current" | "orbit" | "track";
export const sceneApi = {
  fly: false,
  preview: "current" as ShotMode,
  capture: (): { position: Vec3; target: Vec3 } => ({
    position: [50, 48, 65],
    target: [0, 17, 0],
  }),
  setPreview: (_mode: ShotMode) => {},
  begin: (_width: number, _height: number, _mode: ShotMode) => {},
  draw: (_time: number) => {},
  end: () => {},
  canvas: null as HTMLCanvasElement | null,
};
export function cameraAt(keys: CameraKey[], time: number) {
  if (!keys.length) return null;
  if (time <= keys[0].time) return keys[0];
  for (let i = 1; i < keys.length; i++)
    if (time < keys[i].time) {
      const a = keys[i - 1],
        b = keys[i],
        t = (time - a.time) / (b.time - a.time),
        u = t * t * (3 - 2 * t);
      const mix = (x: Vec3, y: Vec3) =>
        x.map((v, k) => v + (y[k] - v) * u) as Vec3;
      return {
        position: mix(a.position, b.position),
        target: mix(a.target, b.target),
      };
    }
  return keys[keys.length - 1];
}
