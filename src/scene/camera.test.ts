import { describe, it, expect } from "vitest";
import { cameraAt } from "./api";
import { demo } from "../core/demo";
import { parseProject, validateProject } from "../core/io";
import { clock, advance } from "../core/engine";
import type { CameraKey } from "../core/types";
const keys: CameraKey[] = [
  { id: "c1", time: 0, position: [0, 10, 40], target: [0, 10, 0] },
  { id: "c2", time: 10, position: [40, 20, 0], target: [0, 20, 0] },
];
describe("自由相機與影片資料", () => {
  it("無鏡頭影格時不覆蓋 Free cam", () => expect(cameraAt([], 3)).toBeNull());
  it("鏡頭中點平滑插值與邊界維持", () => {
    expect(cameraAt(keys, 5)).toEqual({
      position: [20, 15, 20],
      target: [0, 15, 0],
    });
    expect(cameraAt(keys, -1)).toEqual(keys[0]);
    expect(cameraAt(keys, 12)).toEqual(keys[1]);
  });
  it("鏡頭與光影資料完整往返", () => {
    const p = demo(10);
    p.cameras = keys;
    p.look.bloom = 1.5;
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("舊版 v1 JSON 補齊視覺與鏡頭預設", () => {
    const p: any = demo(10);
    delete p.look;
    delete p.cameras;
    const q = validateProject(p);
    expect(q.cameras).toEqual([]);
    expect(q.look.bloom).toBe(1.1);
  });
  it("拒絕不合法的鏡頭位置與時間", () => {
    const p = demo(10);
    p.cameras = [{ ...keys[0], target: [0, 10, 40] }];
    expect(() => validateProject(p)).toThrow("鏡頭位置不能");
    p.cameras = [{ ...keys[0], time: 25 }];
    expect(() => validateProject(p)).toThrow();
  });
  it("預覽在輸出區間終點精確停止", () => {
    const p = demo(10);
    clock.time = 1;
    clock.playing = true;
    clock.stopAt = 2;
    advance(p, 5);
    expect(clock.time).toBe(2);
    expect(clock.playing).toBe(false);
    expect(clock.stopAt).toBeNull();
  });
});
