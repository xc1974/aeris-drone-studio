import { create } from "zustand";
import type {
  Project,
  Vec3,
  Light,
  LightKey,
  Formation,
  FormationParams,
  Effect,
} from "../core/types";
import { uid } from "../core/types";
import { demo } from "../core/demo";
import { clock, positionAt, lightAt } from "../core/engine";
import { formation } from "../core/formations";
import { bakeEffect } from "../core/effects";
import { storageKey, parseProject, validateProject } from "../core/io";
interface State {
  p: Project;
  selected: string[];
  frame: string | null;
  past: Project[];
  future: Project[];
  message: string;
  edit: (fn: (p: Project) => void) => void;
  notify: (s: string) => void;
  load: (p: Project) => void;
  select: (id: string, multi?: boolean) => void;
  selectFrame: (id: string) => void;
  seek: (t: number) => void;
  undo: () => void;
  redo: () => void;
  count: (n: number) => void;
  remove: () => void;
  positions: (
    v: Partial<Record<0 | 1 | 2, number>>,
    relative?: boolean,
  ) => void;
  generate: (type: Formation, params: FormationParams) => void;
  addFrame: () => void;
  deleteFrame: () => void;
  moveFrame: (t: number) => void;
  lights: (patch: Partial<Light>, easing?: LightKey["easing"]) => void;
  effect: (e: Omit<Effect, "id" | "members">) => void;
}
let initial = demo();
let recovery = "";
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) initial = parseProject(saved);
} catch {
  recovery = "本機暫存損壞，已載入示範專案。";
}
clock.time = initial.frames[0].time;
export const useStore = create<State>((set, get) => ({
  p: initial,
  selected: [],
  frame: initial.frames[0].id,
  past: [],
  future: [],
  message: recovery,
  notify: (message) => set({ message }),
  edit: (fn) => {
    try {
      const old = get().p,
        next = structuredClone(old);
      fn(next);
      validateProject(next);
      set({ p: next, past: [...get().past.slice(-39), old], future: [] });
    } catch (e) {
      set({ message: (e as Error).message });
    }
  },
  load: (p) => {
    const valid = validateProject(p);
    clock.playing = false;
    clock.stopAt = null;
    clock.time = valid.frames[0].time;
    set({
      p: valid,
      selected: [],
      frame: valid.frames[0].id,
      past: [],
      future: [],
      message: "專案已載入",
    });
  },
  select: (id, multi) =>
    set((s) => ({
      selected: multi
        ? s.selected.includes(id)
          ? s.selected.filter((x) => x !== id)
          : [...s.selected, id]
        : [id],
    })),
  selectFrame: (id) => {
    const f = get().p.frames.find((f) => f.id === id);
    if (f) {
      clock.playing = false;
      clock.stopAt = null;
      clock.time = f.time;
      set({ frame: id });
    }
  },
  seek: (t) => {
    clock.playing = false;
    clock.stopAt = null;
    clock.time = Math.max(0, Math.min(get().p.animation.duration, t));
    set({ frame: null });
  },
  undo: () => {
    const s = get();
    if (s.past.length) {
      clock.playing = false;
      set({
        p: s.past[s.past.length - 1],
        past: s.past.slice(0, -1),
        future: [s.p, ...s.future],
        frame: null,
        selected: [],
        message: "已復原",
      });
      clock.time = Math.min(clock.time, get().p.animation.duration);
    }
  },
  redo: () => {
    const s = get();
    if (s.future.length) {
      clock.playing = false;
      set({
        p: s.future[0],
        future: s.future.slice(1),
        past: [...s.past, s.p],
        frame: null,
        selected: [],
        message: "已重做",
      });
      clock.time = Math.min(clock.time, get().p.animation.duration);
    }
  },
  count: (n) => {
    if (!Number.isInteger(n) || n < 1 || n > 500)
      return get().notify("請輸入 1～500 的整數");
    get().edit((p) => {
      if (n < p.drones.length) {
        const removed = p.drones.slice(n).map((d) => d.id);
        p.drones = p.drones.slice(0, n);
        p.frames.forEach((f) =>
          removed.forEach((id) => delete f.positions[id]),
        );
        p.groups.forEach(
          (g) => (g.members = g.members.filter((id) => !removed.includes(id))),
        );
        p.effects.forEach(
          (e) => (e.members = e.members.filter((id) => !removed.includes(id))),
        );
      } else
        while (p.drones.length < n) {
          const id = `D-${uid().slice(0, 8)}`,
            i = p.drones.length;
          p.drones.push({
            id,
            light: { on: true, color: "#67ddff", brightness: 1 },
            lights: [],
          });
          p.frames.forEach(
            (f) =>
              (f.positions[id] = [
                ((i % 25) - 12) * 3,
                4 + Math.floor(i / 25) * 3,
                -30,
              ]),
          );
        }
    });
    set({ selected: [] });
  },
  remove: () => {
    const ids = get().selected;
    if (get().p.drones.length - ids.length < 1)
      return get().notify("至少保留一架無人機");
    get().edit((p) => {
      p.drones = p.drones.filter((d) => !ids.includes(d.id));
      p.frames.forEach((f) => ids.forEach((id) => delete f.positions[id]));
      p.groups.forEach(
        (g) => (g.members = g.members.filter((id) => !ids.includes(id))),
      );
      p.effects.forEach(
        (e) => (e.members = e.members.filter((id) => !ids.includes(id))),
      );
    });
    set({ selected: [] });
  },
  positions: (v, relative = false) => {
    const s = get();
    if (!s.frame || clock.playing)
      return s.notify("請先暫停並選取位置關鍵影格");
    s.edit((p) => {
      const f = p.frames.find((f) => f.id === s.frame)!;
      s.selected.forEach((id) => {
        Object.entries(v).forEach(([k, value]) => {
          const i = Number(k);
          f.positions[id][i] = relative ? f.positions[id][i] + value! : value!;
        });
      });
    });
  },
  generate: (type, params) => {
    const s = get();
    if (!s.frame || clock.playing)
      return s.notify("請先暫停並選取位置關鍵影格");
    s.edit((p) => {
      const f = p.frames.find((f) => f.id === s.frame)!;
      const values = formation(type, p.drones.length, params);
      p.drones.forEach((d, i) => (f.positions[d.id] = values[i]));
    });
  },
  addFrame: () => {
    const s = get(),
      time = Number(clock.time.toFixed(3));
    const existing = s.p.frames.find((f) => Math.abs(f.time - time) < 0.001);
    if (existing) {
      s.selectFrame(existing.id);
      return s.notify("此時間已有位置影格，已選取");
    }
    const id = uid();
    s.edit((p) => {
      p.frames.push({
        id,
        name: `隊形 ${p.frames.length + 1}`,
        time,
        easing: "smooth",
        positions: Object.fromEntries(
          p.drones.map((d) => [d.id, positionAt(s.p, d.id, time)]),
        ),
      });
      p.frames.sort((a, b) => a.time - b.time);
    });
    s.selectFrame(id);
  },
  deleteFrame: () => {
    const s = get();
    if (s.p.frames.length === 1) return s.notify("至少保留一個位置影格");
    s.edit((p) => {
      p.frames = p.frames.filter((f) => f.id !== s.frame);
    });
    set({ frame: null });
  },
  moveFrame: (t) => {
    const s = get();
    s.edit((p) => {
      if (
        p.frames.some((f) => f.id !== s.frame && Math.abs(f.time - t) < 0.001)
      )
        throw new Error("位置影格時間重複");
      p.frames.find((f) => f.id === s.frame)!.time = t;
      p.frames.sort((a, b) => a.time - b.time);
    });
    if (get().p !== s.p) clock.time = t;
  },
  lights: (patch, easing) => {
    const s = get();
    if (clock.playing) return s.notify("請先暫停，再寫入燈光影格");
    const time = Number(clock.time.toFixed(3));
    s.edit((p) => {
      p.drones
        .filter((d) => s.selected.includes(d.id))
        .forEach((d) => {
          const existing = d.lights.find(
            (k) => Math.abs(k.time - time) < 0.0005,
          );
          if (existing) {
            Object.assign(existing, patch);
            if (easing) existing.easing = easing;
          } else {
            d.lights.push({
              ...lightAt(d, time),
              ...patch,
              id: uid(),
              time,
              easing: easing || "linear",
            });
            d.lights.sort((a, b) => a.time - b.time);
          }
        });
    });
  },
  effect: (e) => {
    const s = get();
    if (!s.selected.length) return s.notify("請先選取效果對象");
    const steps =
      e.type === "rainbow"
        ? 5
        : e.type === "blink" || e.type === "breathe"
          ? 2
          : 0;
    const estimated =
      (steps ? Math.ceil(e.duration / e.period) * steps + 2 : 3) *
      s.selected.length;
    if (estimated > 100000 || estimated / s.selected.length > 10000)
      return s.notify("效果影格過多，請增加週期或減少持續時間");
    s.edit((p) => {
      const effect: Effect = { ...e, id: uid(), members: [...s.selected] };
      if (
        e.start +
          e.duration +
          (e.type === "chase" ? (s.selected.length - 1) * e.delay : 0) >
        p.animation.duration
      )
        throw new Error("效果超過動畫長度，請調整時間或總長");
      p.drones
        .filter((d) => s.selected.includes(d.id))
        .forEach((d) => {
          d.lights = bakeEffect(d, effect, effect.members.indexOf(d.id));
        });
      p.effects.push(effect);
    });
  },
}));
