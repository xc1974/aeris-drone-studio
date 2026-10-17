import type { Project } from "./types";
const fail = (path: string, msg: string): never => {
  throw new Error(`${path}：${msg}`);
};
export function validateProject(input: unknown): Project {
  // Validate all nested data before allowing it into the editor / renderer.
  const obj = (v: any, p: string) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) fail(p, "需要物件");
  };
  const arr = (v: any, p: string, max: number) => {
    if (!Array.isArray(v) || v.length > max)
      fail(p, `需要陣列，最多 ${max} 筆`);
  };
  const str = (v: any, p: string) => {
    if (typeof v !== "string" || !v.trim() || v.length > 200)
      fail(p, "需要 1～200 字元文字");
  };
  const num = (v: any, p: string, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      fail(p, `需要 ${min}～${max} 的有限數值`);
  };
  const bool = (v: any, p: string) => {
    if (typeof v !== "boolean") fail(p, "需要布林值");
  };
  const one = (v: any, values: string[], p: string) => {
    if (!values.includes(v)) fail(p, "不支援的選項");
  };
  const unique = (values: string[], p: string) => {
    if (new Set(values).size !== values.length) fail(p, "不可重複");
  };
  const light = (l: any, p: string) => {
    obj(l, p);
    bool(l.on, p + ".on");
    if (typeof l.color !== "string" || !/^#[0-9a-f]{6}$/i.test(l.color))
      fail(p + ".color", "需要 #RRGGBB 色碼");
    num(l.brightness, p + ".brightness", 0, 1);
  };
  const p: any = input;
  obj(p, "專案");
  if (p.version !== 1) fail("version", "僅支援格式版本 1");
  str(p.name, "name");
  obj(p.animation, "animation");
  num(p.animation.duration, "duration", 0.1, 600);
  num(p.animation.speed, "speed", 0.1, 4);
  bool(p.animation.loop, "loop");
  obj(p.scene, "scene");
  num(p.scene.minDistance, "minDistance", 0, 100);
  bool(p.scene.labels, "labels");
  bool(p.scene.trails, "trails");
  one(p.scene.view, ["free", "top", "front", "side"], "view");
  arr(p.drones, "drones", 500);
  if (!p.drones.length) fail("drones", "至少一架");
  let lightCount = 0;
  p.drones.forEach((d: any, i: number) => {
    const path = `drones[${i}]`;
    obj(d, path);
    str(d.id, path + ".id");
    light(d.light, path + ".light");
    arr(d.lights, path + ".lights", 10000);
    lightCount += d.lights.length;
    d.lights.forEach((k: any, j: number) => {
      light(k, `${path}.lights[${j}]`);
      str(k.id, "燈光 ID");
      num(k.time, "燈光時間", 0, p.animation.duration);
      one(k.easing, ["step", "linear", "smooth"], "燈光插值");
      if (j && k.time <= d.lights[j - 1].time)
        fail(path + ".lights", "時間必須遞增且不可重複");
    });
    unique(
      d.lights.map((k: any) => k.id),
      path + ".lights ID",
    );
  });
  if (lightCount > 100000) fail("lights", "總影格超過 100000 筆");
  const ids: string[] = p.drones.map((d: any) => d.id);
  unique(ids, "drone ID");
  const members = (v: any, path: string) => {
    arr(v, path, 500);
    v.forEach((id: any) => {
      if (!ids.includes(id)) fail(path, "引用不存在的無人機 ID");
    });
    unique(v, path);
  };
  arr(p.frames, "frames", 1000);
  if (!p.frames.length) fail("frames", "至少一個位置影格");
  p.frames.forEach((f: any, i: number) => {
    obj(f, "frame");
    str(f.id, "frame ID");
    str(f.name, "frame name");
    num(f.time, "位置時間", 0, p.animation.duration);
    one(f.easing, ["linear", "smooth"], "位置插值");
    if (i && f.time <= p.frames[i - 1].time)
      fail("frames", "時間必須遞增且不可重複");
    obj(f.positions, "positions");
    if (
      Object.keys(f.positions).length !== ids.length ||
      Object.keys(f.positions).some((id) => !ids.includes(id))
    )
      fail("positions", "必須恰好包含所有無人機 ID");
    ids.forEach((id) => {
      const v = f.positions[id];
      arr(v, "position", 3);
      if (v.length !== 3) fail("position", "需要 XYZ 三個分量");
      v.forEach((n: any) => num(n, "座標", -10000, 10000));
    });
  });
  unique(
    p.frames.map((f: any) => f.id),
    "frame ID",
  );
  arr(p.groups, "groups", 500);
  p.groups.forEach((g: any) => {
    obj(g, "group");
    str(g.id, "group ID");
    str(g.name, "group name");
    members(g.members, "group members");
  });
  unique(
    p.groups.map((g: any) => g.id),
    "group ID",
  );
  arr(p.effects, "effects", 10000);
  p.effects.forEach((e: any) => {
    obj(e, "effect");
    str(e.id, "effect ID");
    one(
      e.type,
      ["fixed", "fadeIn", "fadeOut", "blink", "breathe", "rainbow", "chase"],
      "effect type",
    );
    members(e.members, "effect members");
    num(e.start, "effect start", 0, p.animation.duration);
    num(e.duration, "effect duration", 0.1, 600);
    num(e.period, "effect period", 0.1, 600);
    num(e.delay, "effect delay", 0, 600);
    num(e.brightness, "effect brightness", 0, 1);
    light({ on: true, color: e.color, brightness: e.brightness }, "effect");
    if (
      e.start +
        e.duration +
        (e.type === "chase" ? Math.max(0, e.members.length - 1) * e.delay : 0) >
      p.animation.duration + 1e-7
    )
      fail("effect", "效果超過動畫長度");
  });
  unique(
    p.effects.map((e: any) => e.id),
    "effect ID",
  );
  // Older v1 files remain compatible; new visual/camera fields get explicit defaults.
  const result = structuredClone(p);
  if (result.look === undefined)
    result.look = { bloom: 1.1, exposure: 1, shadows: true, helpers: true };
  if (result.cameras === undefined) result.cameras = [];
  obj(result.look, "look");
  num(result.look.bloom, "bloom", 0, 3);
  num(result.look.exposure, "exposure", 0.2, 3);
  bool(result.look.shadows, "shadows");
  bool(result.look.helpers, "helpers");
  arr(result.cameras, "cameras", 1000);
  result.cameras.forEach((k: any, i: number) => {
    obj(k, "camera");
    str(k.id, "camera ID");
    num(k.time, "camera time", 0, p.animation.duration);
    for (const name of ["position", "target"]) {
      arr(k[name], name, 3);
      if (k[name].length !== 3) fail(name, "需要 XYZ 三個分量");
      k[name].forEach((n: any) => num(n, name, -10000, 10000));
    }
    if (k.position.every((v: number, j: number) => v === k.target[j]))
      fail("camera", "鏡頭位置不能等於注視點");
    if (i && k.time <= result.cameras[i - 1].time)
      fail("cameras", "時間必須遞增且不可重複");
  });
  unique(
    result.cameras.map((k: any) => k.id),
    "camera ID",
  );
  return result as Project;
}
export function parseProject(text: string) {
  if (text.length > 30_000_000) throw new Error("檔案超過 30 MB");
  try {
    return validateProject(JSON.parse(text));
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new Error("JSON 格式錯誤，請選擇完整專案檔案");
    throw e;
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportProject(p: Project) {
  download(
    new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
    `${p.name}.json`,
  );
}
export const storageKey = "aeris-project-v1";
