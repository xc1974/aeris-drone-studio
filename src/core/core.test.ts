import { describe, it, expect, beforeEach, vi } from "vitest";
import { formation, defaultParams } from "./formations";
import { demo } from "./demo";
import { positionAt, lightAt, closePairs, clock, advance } from "./engine";
import { parseProject, validateProject } from "./io";
import { bakeEffect } from "./effects";
import type { Formation, Drone, Effect } from "./types";
describe("隊形", () => {
  for (const type of [
    "line",
    "grid",
    "circle",
    "helix",
    "sphere",
    "heart",
  ] as Formation[])
    for (const count of [1, 10, 100, 300, 500])
      it(`${type} 恰好 ${count} 個有限且不重複的位置`, () => {
        const values = formation(type, count, defaultParams);
        expect(values).toHaveLength(count);
        expect(values.flat().every(Number.isFinite)).toBe(true);
        expect(new Set(values.map((v) => v.join(","))).size).toBe(count);
      });
  it("旋轉、中心與單位一致", () => {
    const values = formation("line", 3, {
      ...defaultParams,
      center: [5, 10, 20],
      rotation: 90,
      spacing: 2,
    });
    expect(values[1]).toEqual([5, 10, 20]);
    expect(values[2][0]).toBeCloseTo(5);
    expect(values[2][2]).toBeCloseTo(22);
  });
});
describe("位置和燈光插值", () => {
  const p = demo(10),
    d = p.drones[1];
  it("位置端點、邊界與中點", () => {
    const id = d.id;
    expect(positionAt(p, id, -1)).toEqual(p.frames[0].positions[id]);
    expect(positionAt(p, id, 25)).toEqual(p.frames[2].positions[id]);
    positionAt(p, id, 6).forEach((v, i) =>
      expect(v).toBeCloseTo(
        (p.frames[0].positions[id][i] + p.frames[1].positions[id][i]) / 2,
        10,
      ),
    );
  });
  it("非中點能區分 linear 和 smooth", () => {
    const q = structuredClone(p);
    q.frames[0].easing = "linear";
    expect(positionAt(q, d.id, 3)).not.toEqual(positionAt(p, d.id, 3));
  });
  it("首燈光影格之前使用預設、尾端保持", () => {
    const x: Drone = {
      id: "x",
      light: { on: true, color: "#ff0000", brightness: 0.6 },
      lights: [
        {
          id: "1",
          time: 2,
          on: false,
          color: "#00ff00",
          brightness: 0.2,
          easing: "linear",
        },
        {
          id: "2",
          time: 4,
          on: true,
          color: "#0000ff",
          brightness: 1,
          easing: "linear",
        },
      ],
    };
    expect(lightAt(x, 0)).toEqual(x.light);
    expect(lightAt(x, 3).on).toBe(false);
    expect(lightAt(x, 3).color).toBe("#008080");
    expect(lightAt(x, 3).brightness).toBeCloseTo(0.6, 10);
    expect(lightAt(x, 4)).toEqual({
      on: true,
      color: "#0000ff",
      brightness: 1,
    });
    expect(lightAt(x, 20)).toEqual(lightAt(x, 4));
  });
  it("瞬間切換不提早改變狀態", () => {
    const x = structuredClone(d);
    x.lights[0].easing = "step";
    expect(lightAt(x, 11).brightness).toBe(0.15);
    expect(lightAt(x, 12).brightness).toBe(1);
  });
  it("同一時間位置與燈光可重現、互不覆蓋", () => {
    const before = positionAt(p, d.id, 7);
    const light = lightAt(d, 7);
    for (const time of [24, 0, 12, 7]) {
      positionAt(p, d.id, time);
      lightAt(d, time);
    }
    expect(positionAt(p, d.id, 7)).toEqual(before);
    expect(lightAt(d, 7)).toEqual(light);
    expect(new Set(p.drones.map((d) => lightAt(d, 0).color)).size).toBe(10);
    expect(lightAt(p.drones[0], 1).brightness).toBe(0);
    expect(lightAt(p.drones[9], 1).brightness).toBe(0.8);
  });
  it("經過時間、暫停與循環", () => {
    clock.time = 0;
    clock.playing = true;
    advance(p, 3);
    expect(clock.time).toBe(3);
    clock.playing = false;
    advance(p, 2);
    expect(clock.time).toBe(3);
    clock.playing = true;
    advance(p, 25);
    expect(clock.time).toBe(4);
    clock.playing = false;
  });
  it("空間分格距離檢查", () => {
    const r = closePairs(
      [
        [0, 0, 0],
        [0.5, 0, 0],
        [5, 0, 0],
        [-0.5, 0, 0],
      ],
      1,
    );
    expect(r.pairs).toBe(2);
    expect([...r.flagged].sort()).toEqual([0, 1, 3]);
    expect(
      closePairs(
        [
          [0, 0, 0],
          [0, 0, 0],
        ],
        0,
      ).pairs,
    ).toBe(0);
  });
});
describe("JSON 驗證", () => {
  it("完整往返保持位置、各架燈光、群組和效果", () => {
    const p = demo();
    const q = parseProject(JSON.stringify(p));
    expect(q).toEqual(p);
    for (const time of [0, 1, 5.35, 12, 24])
      for (const d of p.drones) {
        expect(positionAt(q, d.id, time)).toEqual(positionAt(p, d.id, time));
        expect(
          lightAt(
            q.drones.find((x) => x.id === d.id)!,
            time,
          ),
        ).toEqual(lightAt(d, time));
      }
  });
  const invalid: [string, (p: any) => void][] = [
    ["版本", (p) => (p.version = 2)],
    ["缺欄位", (p) => delete p.scene],
    ["NaN", (p) => (p.frames[0].positions["D-001"][1] = NaN)],
    ["重複 ID", (p) => (p.drones[1].id = p.drones[0].id)],
    ["缺位置", (p) => delete p.frames[0].positions["D-001"]],
    ["多位置", (p) => (p.frames[0].positions["other"] = [1, 2, 3])],
    ["錯色碼", (p) => (p.drones[0].light.color = "red")],
    ["亮度溢位", (p) => (p.drones[0].light.brightness = 2)],
    ["重複時間", (p) => (p.frames[1].time = 0)],
    ["群組外部 ID", (p) => p.groups[0].members.push("missing")],
    ["錯誤插值", (p) => (p.drones[0].lights[0].easing = "other")],
    ["超長效果", (p) => (p.effects[0].duration = 900)],
    ["空專案", (p) => (p.drones = [])],
  ];
  for (const [name, mutate] of invalid)
    it(`拒絕 ${name}`, () => {
      const p = demo(10);
      mutate(p);
      expect(() => validateProject(p)).toThrow();
    });
  it("JSON 語法錯誤有中文訊息", () =>
    expect(() => parseProject("{")).toThrow("JSON 格式錯誤"));
});
describe("燈光效果", () => {
  for (const type of [
    "fixed",
    "fadeIn",
    "fadeOut",
    "blink",
    "breathe",
    "rainbow",
    "chase",
  ] as Effect["type"][])
    it(`${type} 烘焙為穩定、獨立且有序的影格`, () => {
      const p = demo(10),
        before = structuredClone(p.drones[1]);
      const e: Effect = {
        id: "fx",
        type,
        members: [p.drones[0].id],
        start: 1,
        duration: 4,
        color: "#ff0000",
        brightness: 0.8,
        period: 1,
        delay: 0.5,
      };
      const keys = bakeEffect(p.drones[0], e, 0);
      expect(keys.length).toBeGreaterThan(1);
      expect(new Set(keys.map((k) => k.time)).size).toBe(keys.length);
      expect(keys.every((k, i) => i === 0 || k.time > keys[i - 1].time)).toBe(
        true,
      );
      expect(p.drones[1]).toEqual(before);
    });
});
describe("編輯器資料同步", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  });
  it("增刪、獨立燈光批次、無選取影格禁止位置修改與復原", async () => {
    const { useStore } = await import("../state/store");
    const s = () => useStore.getState();
    s().load(demo(10));
    s().count(12);
    expect(
      s().p.frames.every((f) => Object.keys(f.positions).length === 12),
    ).toBe(true);
    expect(new Set(s().p.drones.map((d) => d.id)).size).toBe(12);
    s().select("D-001");
    s().select("D-002", true);
    const colors = s()
      .p.drones.slice(0, 2)
      .map((d) => lightAt(d, 0).color);
    const frames = structuredClone(s().p.frames);
    s().lights({ brightness: 0.3 });
    expect(
      s()
        .p.drones.slice(0, 2)
        .map((d) => lightAt(d, 0).color),
    ).toEqual(colors);
    expect(s().p.frames).toEqual(frames);
    s().seek(2);
    const frozen = structuredClone(s().p);
    s().positions({ 0: 9 });
    expect(s().p).toEqual(frozen);
    s().remove();
    expect(s().p.drones).toHaveLength(10);
    expect(
      s().p.frames.every((f) => !f.positions["D-001"] && !f.positions["D-002"]),
    ).toBe(true);
    expect(s().p.groups.every((g) => !g.members.includes("D-002"))).toBe(true);
    s().undo();
    expect(s().p.drones).toHaveLength(12);
  });
});
