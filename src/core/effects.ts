import type { Drone, Effect, LightKey } from "./types";
import { uid } from "./types";
export function bakeEffect(drone: Drone, e: Effect, index: number): LightKey[] {
  const start = e.start + (e.type === "chase" ? index * e.delay : 0),
    end = start + e.duration;
  const keys: LightKey[] = [];
  const add = (
    time: number,
    brightness: number,
    easing: LightKey["easing"] = "linear",
    color = e.color,
  ) => keys.push({ id: uid(), time, on: true, color, brightness, easing });
  if (e.type === "fixed" || e.type === "chase") {
    if (e.type === "chase") add(e.start, 0, "step");
    add(start, e.brightness, "step");
    add(end, e.brightness, "step");
  }
  if (e.type === "fadeIn" || e.type === "fadeOut") {
    add(start, e.type === "fadeIn" ? 0 : e.brightness, "smooth");
    add(end, e.type === "fadeIn" ? e.brightness : 0, "smooth");
  }
  if (e.type === "blink") {
    for (let t = start; t < end; t += e.period) {
      add(t, e.brightness, "step");
      if (t + e.period / 2 < end) add(t + e.period / 2, 0, "step");
    }
    add(end, e.brightness, "step");
  }
  if (e.type === "breathe") {
    for (let t = start; t < end; t += e.period / 2)
      add(
        t,
        Math.round((t - start) / (e.period / 2)) % 2 ? e.brightness : 0,
        "smooth",
      );
    add(end, 0, "smooth");
  }
  if (e.type === "rainbow") {
    const colors = ["#ff557c", "#ffbd69", "#62efb2", "#5ebcff", "#a78bfa"];
    for (let t = start, i = 0; t < end; t += e.period / 5, i++)
      add(t, e.brightness, "linear", colors[i % 5]);
    add(end, e.brightness, "linear", colors[0]);
  }
  const unique = new Map<number, LightKey>();
  keys.forEach((k) => unique.set(k.time, k));
  return [
    ...drone.lights.filter((k) => k.time < e.start || k.time > end),
    ...unique.values(),
  ].sort((a, b) => a.time - b.time);
}
