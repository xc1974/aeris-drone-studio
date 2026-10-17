import { useState } from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  Repeat2,
  Plus,
  Trash2,
  Copy,
  Diamond,
  Lightbulb,
  Move3D,
} from "lucide-react";
import { useStore } from "../state/store";
import { clock } from "../core/engine";
import { uid } from "../core/types";
import { NumberField, useTime } from "./common";
export default function Timeline() {
  const s = useStore(),
    time = useTime(),
    [lightId, setLightId] = useState<string | null>(null);
  const frame = s.p.frames.find((f) => f.id === s.frame),
    drone = s.p.drones.find((d) => d.id === s.selected[0]),
    lightKey = drone?.lights.find((k) => k.id === lightId),
    duration = s.p.animation.duration;
  const lightEdit = (fn: (keys: NonNullable<typeof drone>["lights"]) => void) =>
    s.edit((p) => {
      if (drone) fn(p.drones.find((d) => d.id === drone.id)!.lights);
    });
  return (
    <footer className="timeline">
      <div className="transport">
        <div className="transport-buttons">
          <button title="回到起點" onClick={() => s.seek(0)}>
            <SkipBack size={16} />
          </button>
          <button
            className="play-button"
            title={clock.playing ? "暫停" : "播放"}
            onClick={() => {
              if (clock.time >= duration) clock.time = 0;
              clock.stopAt = null;
              clock.playing = !clock.playing;
              if (clock.playing) useStore.setState({ frame: null });
              else s.notify("已暫停");
            }}
          >
            {clock.playing ? (
              <Pause size={18} />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            title="停止"
            onClick={() => {
              s.seek(0);
              s.selectFrame(s.p.frames[0].id);
            }}
          >
            <Square size={14} />
          </button>
          <button
            title="循環"
            className={s.p.animation.loop ? "active" : ""}
            onClick={() =>
              s.edit((p) => {
                p.animation.loop = !p.animation.loop;
              })
            }
          >
            <Repeat2 size={16} />
          </button>
        </div>
        <div className="time-display">
          {time.toFixed(2)}
          <small> / {duration.toFixed(2)} s</small>
        </div>
        <select
          aria-label="播放速度"
          value={s.p.animation.speed}
          onChange={(e) =>
            s.edit((p) => {
              p.animation.speed = Number(e.target.value);
            })
          }
        >
          {[0.25, 0.5, 1, 1.5, 2, 4].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <span className="transport-spacer" />
        <NumberField
          label="總長 s"
          value={duration}
          min={0.1}
          max={600}
          onChange={(n) => {
            s.edit((p) => {
              p.animation.duration = n;
            });
            clock.time = Math.min(
              clock.time,
              useStore.getState().p.animation.duration,
            );
          }}
        />
        <button className="accent" onClick={s.addFrame}>
          <Plus size={14} />
          位置影格
        </button>
      </div>
      <div className="timeline-editor">
        <div className="track-labels">
          <span className="ruler-title">
            動畫時間軸 <small>秒</small>
          </span>
          <span>
            <Move3D size={14} />
            位置軌道 <em>{s.p.frames.length}</em>
          </span>
          <span>
            <Lightbulb size={14} />
            燈光軌道 <small>{drone?.id || "選取物件以查看"}</small>
          </span>
        </div>
        <div className="tracks">
          <div className="ruler">
            {Array.from({ length: 13 }, (_, i) => (
              <span key={i} style={{ left: `${(i / 12) * 100}%` }}>
                {Number(((duration * i) / 12).toFixed(1))}
              </span>
            ))}
          </div>
          <div className="track-grid position-track">
            {s.p.frames.map((f, i) => (
              <button
                key={f.id}
                title={`${f.name} · ${f.time}s`}
                className={`position-key ${f.id === s.frame ? "selected" : ""}`}
                style={{ left: `${(f.time / duration) * 100}%` }}
                onClick={() => {
                  s.selectFrame(f.id);
                  setLightId(null);
                }}
              >
                <Diamond size={13} fill="currentColor" />
                <span>
                  {String(i + 1).padStart(2, "0")} {f.name}
                </span>
              </button>
            ))}
          </div>
          <div className="track-grid light-track">
            {drone?.lights.map((k) => (
              <button
                key={k.id}
                title={`${k.time}s · ${k.color} · ${Math.round(k.brightness * 100)}% · ${k.on ? "開" : "關"}`}
                className={`light-key ${k.id === lightId ? "selected" : ""}`}
                style={{
                  left: `${(k.time / duration) * 100}%`,
                  color: k.on ? k.color : "#526078",
                }}
                onClick={() => {
                  s.seek(k.time);
                  setLightId(k.id);
                }}
              >
                <Diamond size={12} fill="currentColor" />
              </button>
            ))}
            {!drone && (
              <span className="empty-track">
                每架無人機有獨立燈光軌道 · 多選時顯示第一架
              </span>
            )}
          </div>
          <div
            className="playhead"
            style={{ left: `${(time / duration) * 100}%` }}
          >
            <i />
          </div>
          <input
            className="scrubber"
            type="range"
            min={0}
            max={duration}
            step={0.001}
            value={time}
            aria-label="拖曳播放頭"
            onChange={(e) => {
              s.seek(Number(e.target.value));
              setLightId(null);
            }}
          />
        </div>
      </div>
      <div className="key-editor">
        {frame ? (
          <>
            <span className="key-label">位置影格</span>
            <input
              aria-label="位置影格名稱"
              key={frame.id}
              defaultValue={frame.name}
              onBlur={(e) =>
                s.edit((p) => {
                  p.frames.find((f) => f.id === frame.id)!.name =
                    e.target.value;
                })
              }
            />
            <NumberField
              label="時間 s"
              value={frame.time}
              min={0}
              max={duration}
              onChange={s.moveFrame}
            />
            <select
              aria-label="位置插值"
              value={frame.easing}
              onChange={(e) =>
                s.edit((p) => {
                  p.frames.find((f) => f.id === frame.id)!.easing = e.target
                    .value as "linear" | "smooth";
                })
              }
            >
              <option value="linear">線性</option>
              <option value="smooth">Ease-in-out</option>
            </select>
            <button onClick={s.deleteFrame} title="刪除位置影格">
              <Trash2 size={14} />
            </button>
          </>
        ) : lightKey && drone ? (
          <>
            <span className="key-label">燈光 · {drone.id}</span>
            <NumberField
              label="時間 s"
              value={lightKey.time}
              min={0}
              max={duration}
              onChange={(n) => {
                lightEdit((keys) => {
                  if (
                    keys.some(
                      (k) => k.id !== lightId && Math.abs(k.time - n) < 0.001,
                    )
                  )
                    throw new Error("燈光影格時間重複");
                  keys.find((k) => k.id === lightId)!.time = n;
                  keys.sort((a, b) => a.time - b.time);
                });
                s.seek(n);
              }}
            />
            <select
              aria-label="燈光影格插值"
              value={lightKey.easing}
              onChange={(e) =>
                lightEdit((keys) => {
                  keys.find((k) => k.id === lightId)!.easing = e.target
                    .value as "step" | "linear" | "smooth";
                })
              }
            >
              <option value="step">瞬間切換</option>
              <option value="linear">線性</option>
              <option value="smooth">Ease-in-out</option>
            </select>
            <button
              title="複製到播放頭；請先指定新時間"
              onClick={() => {
                const text = prompt(
                  "複製燈光影格至時間（秒）",
                  String(Math.min(duration, lightKey.time + 0.5)),
                );
                if (text === null) return;
                const t = Number(text);
                lightEdit((keys) => {
                  if (
                    !Number.isFinite(t) ||
                    keys.some((k) => Math.abs(k.time - t) < 0.001)
                  )
                    throw new Error("時間無效或重複");
                  keys.push({ ...lightKey, id: uid(), time: t });
                  keys.sort((a, b) => a.time - b.time);
                });
              }}
            >
              <Copy size={14} />
              複製
            </button>
            <button
              title="刪除燈光影格"
              onClick={() => {
                lightEdit((keys) => {
                  keys.splice(
                    keys.findIndex((k) => k.id === lightId),
                    1,
                  );
                });
                setLightId(null);
              }}
            >
              <Trash2 size={14} />
            </button>
            <small>顏色／開關／亮度可於右側修改</small>
          </>
        ) : (
          <span className="helper">
            拖曳下方細軌移動播放頭；點選菱形編輯影格。新增位置影格會擷取目前插值位置。
          </span>
        )}
        <span className="transport-spacer" />
        <span className="timeline-legend">
          <i />
          位置 <i />
          燈光
        </span>
      </div>
    </footer>
  );
}
