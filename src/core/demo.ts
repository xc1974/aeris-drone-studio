import { formation, defaultParams } from "./formations";
import { bakeEffect } from "./effects";
import type { Project, Effect, Drone } from "./types";
export function demo(count = 100): Project {
  const palette = [
    "#57d7ff",
    "#6ca9ff",
    "#9689ff",
    "#d78bff",
    "#ff7dc0",
    "#ff7188",
    "#ffa66d",
    "#ffe48a",
    "#b9f39b",
    "#6ce7cf",
  ];
  const drones: Drone[] = Array.from({ length: count }, (_, i) => ({
    id: `D-${String(i + 1).padStart(3, "0")}`,
    light: { on: true, color: palette[i % 10], brightness: 0.8 },
    lights: [],
  }));
  const groups = [
    {
      id: "g-a",
      name: "晨曦 · 漸亮",
      members: drones.slice(1, Math.ceil(count / 2)).map((d) => d.id),
    },
    {
      id: "g-b",
      name: "星河 · 恆亮",
      members: drones.slice(Math.ceil(count / 2)).map((d) => d.id),
    },
  ];
  const effects: Effect[] = [
    {
      id: "fx-blink",
      type: "blink",
      members: [drones[0].id],
      start: 0,
      duration: 24,
      color: palette[0],
      brightness: 1,
      period: 2,
      delay: 0,
    },
  ];
  drones[0].lights = bakeEffect(drones[0], effects[0], 0);
  // Preserve each member's distinct hue while fading the first group.
  for (const d of drones.filter((d) => groups[0].members.includes(d.id))) {
    d.lights = [
      {
        id: `${d.id}-a`,
        time: 0,
        on: true,
        color: d.light.color,
        brightness: 0.15,
        easing: "smooth",
      },
      {
        id: `${d.id}-b`,
        time: 12,
        on: true,
        color: d.light.color,
        brightness: 1,
        easing: "smooth",
      },
    ];
  }
  return {
    cameras: [],
    look: { bloom: 1.1, exposure: 1, shadows: true, helpers: true },
    version: 1,
    name: "星光序曲",
    drones,
    groups,
    effects,
    frames: (
      [
        ["grid", 0, "方形 · 起飛"],
        ["circle", 12, "圓形 · 環繞"],
        ["heart", 24, "愛心 · 綻放"],
      ] as const
    ).map(([type, time, name], i) => ({
      id: `frame-${i}`,
      name,
      time,
      easing: "smooth",
      positions: Object.fromEntries(
        formation(type, count, {
          ...defaultParams,
          center: [0, type === "heart" ? 26 : 16, 0],
        }).map((v, j) => [drones[j].id, v]),
      ),
    })),
    animation: { duration: 24, loop: true, speed: 1 },
    scene: { minDistance: 1.5, labels: false, trails: false, view: "free" },
  };
}
