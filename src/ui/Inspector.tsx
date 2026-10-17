import { useEffect, useState } from "react";
import {
  SlidersHorizontal,
  Move3D,
  Lightbulb,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "../state/store";
import { clock, positionAt, lightAt } from "../core/engine";
import type { EffectType, LightEase } from "../core/types";
import { NumberField, useTime } from "./common";
export default function Inspector() {
  const s = useStore(),
    time = useTime();
  const drones = s.p.drones.filter((d) => s.selected.includes(d.id)),
    first = drones[0],
    f = s.p.frames.find((f) => f.id === s.frame);
  const lights = drones.map((d) => lightAt(d, time)),
    light = lights[0];
  const [hex, setHex] = useState("#67ddff"),
    [easing, setEasing] = useState<LightEase>("linear");
  const [delta, setDelta] = useState([0, 0, 0]),
    [effect, setEffect] = useState<EffectType>("fadeIn"),
    [start, setStart] = useState(0),
    [duration, setDuration] = useState(6),
    [period, setPeriod] = useState(2),
    [delay, setDelay] = useState(0.15),
    [effectColor, setEffectColor] = useState("#67ddff"),
    [brightness, setBrightness] = useState(100);
  useEffect(() => {
    if (light) setHex(light.color);
  }, [light?.color]);
  const mixed = (key: "color" | "brightness" | "on") =>
    lights.some((l) => l[key] !== light?.[key]);
  const editable = Boolean(first && f && !clock.playing),
    position = first ? positionAt(s.p, first.id, time) : [0, 0, 0];
  const writeHex = () => {
    if (/^#[0-9a-f]{6}$/i.test(hex)) s.lights({ color: hex });
    else {
      s.notify("HEX 格式請使用 #RRGGBB");
      setHex(light?.color || "#67ddff");
    }
  };
  return (
    <aside className="right-panel">
      <div className="inspector-heading">
        <SlidersHorizontal size={15} />
        屬性檢視器<span>INSPECTOR</span>
      </div>
      <section>
        <div className="selected-card">
          <span className="drone-symbol">✣</span>
          <div>
            <strong>
              {first
                ? s.selected.length === 1
                  ? first.id
                  : `${s.selected.length} 架無人機`
                : "尚未選取物件"}
            </strong>
            <small>
              {first ? "獨立位置與燈光資料" : "在場景或清單中點選無人機"}
            </small>
          </div>
          {first && <i className="live-dot" />}
        </div>
      </section>
      <section>
        <div className="section-title">
          <span>
            <Move3D size={15} />
            位置
          </span>
          <em>公尺</em>
        </div>
        <p className="helper">
          {f
            ? `編輯影格：${f.name} · ${f.time}s`
            : "請選取位置影格才可修改位置"}
        </p>
        <div className="xyz">
          {position.map((v, i) => (
            <NumberField
              key={i}
              label={["X", "Y 高度", "Z"][i]}
              value={v}
              disabled={!editable}
              onChange={(n) => s.positions({ [i]: n })}
            />
          ))}
        </div>
        {drones.length > 1 && (
          <p className="helper">欄位顯示第一架；輸入數值會統一所選座標。</p>
        )}
        <div className="field-label">批次相對位移</div>
        <div className="xyz">
          {delta.map((v, i) => (
            <NumberField
              key={i}
              value={v}
              label={["ΔX", "ΔY", "ΔZ"][i]}
              disabled={!editable}
              onChange={(n) => setDelta(delta.map((a, k) => (k === i ? n : a)))}
            />
          ))}
        </div>
        <button
          className="full"
          disabled={!editable}
          onClick={() =>
            s.positions({ 0: delta[0], 1: delta[1], 2: delta[2] }, true)
          }
        >
          移動選取物件
        </button>
      </section>
      <section>
        <div className="section-title">
          <span>
            <Lightbulb size={15} />
            燈光
          </span>
          <em>獨立軌道</em>
        </div>
        <p className="helper">
          於播放頭 {time.toFixed(2)}s 寫入選取物件的燈光影格
        </p>
        <fieldset disabled={!first || clock.playing}>
          <label className="switch-row">
            燈光電源 {mixed("on") && <small>多個值</small>}
            <input
              type="checkbox"
              checked={light?.on ?? false}
              onChange={(e) => s.lights({ on: e.target.checked })}
            />
          </label>
          <div className="field-label">
            RGB 顏色 {mixed("color") && <em>多個值</em>}
          </div>
          <div className="color-editor">
            <input
              type="color"
              aria-label="燈光色盤"
              value={light?.color || "#67ddff"}
              onChange={(e) => s.lights({ color: e.target.value })}
            />
            <input
              aria-label="燈光 HEX"
              value={hex}
              maxLength={7}
              onChange={(e) => setHex(e.target.value)}
              onBlur={writeHex}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </div>
          <div className="field-label">
            亮度 {mixed("brightness") && <em>多個值</em>}
            <b>{light ? Math.round(light.brightness * 100) : 0}%</b>
          </div>
          <input
            type="range"
            aria-label="亮度"
            min={0}
            max={100}
            value={(light?.brightness || 0) * 100}
            onChange={(e) =>
              s.lights({ brightness: Number(e.target.value) / 100 })
            }
          />
          <NumberField
            label="亮度 %"
            value={(light?.brightness || 0) * 100}
            min={0}
            max={100}
            step={1}
            onChange={(n) => s.lights({ brightness: n / 100 })}
          />
          <label className="select-row">
            至下一影格
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value as LightEase)}
            >
              <option value="step">瞬間切換</option>
              <option value="linear">線性漸變</option>
              <option value="smooth">Ease-in-out</option>
            </select>
          </label>
          <button className="accent full" onClick={() => s.lights({}, easing)}>
            ＋ 新增／更新燈光關鍵影格
          </button>
        </fieldset>
        <p className="helper">
          每次只改指定屬性；關燈保留色碼。首影格前使用預設燈光，尾影格後維持最後狀態。
        </p>
      </section>
      <section>
        <div className="section-title">
          <span>
            <Sparkles size={15} />
            燈光效果
          </span>
        </div>
        <fieldset disabled={!first || clock.playing}>
          <select
            className="full"
            value={effect}
            onChange={(e) => setEffect(e.target.value as EffectType)}
          >
            {(
              [
                "fixed",
                "fadeIn",
                "fadeOut",
                "blink",
                "breathe",
                "rainbow",
                "chase",
              ] as const
            ).map((v, i) => (
              <option key={v} value={v}>
                {
                  [
                    "固定顏色",
                    "淡入",
                    "淡出",
                    "閃爍",
                    "呼吸燈",
                    "多色漸變",
                    "逐架跑馬燈",
                  ][i]
                }
              </option>
            ))}
          </select>
          <div className="two-fields">
            <NumberField
              label="開始 s"
              value={start}
              min={0}
              max={600}
              onChange={setStart}
            />
            <NumberField
              label="持續 s"
              value={duration}
              min={0.1}
              max={600}
              onChange={setDuration}
            />
            <NumberField
              label="週期 s"
              value={period}
              min={0.1}
              max={600}
              onChange={setPeriod}
            />
            <NumberField
              label="逐架延遲 s"
              value={delay}
              min={0}
              max={600}
              onChange={setDelay}
            />
          </div>
          <label className="color-inline">
            效果顏色
            <input
              type="color"
              value={effectColor}
              onChange={(e) => setEffectColor(e.target.value)}
            />
          </label>
          <NumberField
            label="效果亮度 %"
            min={0}
            max={100}
            value={brightness}
            onChange={setBrightness}
          />
          <button
            className="full"
            onClick={() =>
              s.effect({
                type: effect,
                start,
                duration,
                period,
                delay,
                color: effectColor,
                brightness: brightness / 100,
              })
            }
          >
            套用至 {s.selected.length} 架
          </button>
        </fieldset>
        <p className="helper">
          效果烘焙為獨立燈光影格，取代區間內影格。跑馬燈依目前選取順序；群組／全選皆可套用。
        </p>
      </section>
      <section>
        <div className="section-title">
          <span>
            <ShieldCheck size={15} />
            模擬檢查
          </span>
        </div>
        <NumberField
          label="最小間距 m"
          value={s.p.scene.minDistance}
          min={0}
          max={100}
          onChange={(n) =>
            s.edit((p) => {
              p.scene.minDistance = n;
            })
          }
        />
        <p className="helper caution">
          10 Hz
          離散時間取樣僅供設計預覽，平滑插值不代表避碰，也不保證連續路徑安全。
        </p>
      </section>
    </aside>
  );
}
