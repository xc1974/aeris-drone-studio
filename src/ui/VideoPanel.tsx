import { useEffect, useRef, useState } from "react";
import { X, Film, Play, Download, Camera, Plus, Trash2 } from "lucide-react";
import { useStore } from "../state/store";
import { clock } from "../core/engine";
import { uid } from "../core/types";
import { sceneApi, type ShotMode } from "../scene/api";
import { checkVideo, exportVideo } from "../core/video";
import { download } from "../core/io";
import { NumberField, useTime } from "./common";
export default function VideoPanel({ close }: { close: () => void }) {
  const s = useStore(),
    time = useTime();
  const [mode, setMode] = useState<ShotMode>("current"),
    [height, setHeight] = useState(720),
    [fps, setFps] = useState(30),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(s.p.animation.duration),
    [support, setSupport] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [result, setResult] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [fly, setFly] = useState(sceneApi.fly);
  const abort = useRef<AbortController | null>(null);
  const width = height === 1080 ? 1920 : 1280,
    options = { width, height, fps, start, end, mode };
  useEffect(() => {
    let live = true;
    setSupport(null);
    checkVideo(options)
      .then((v) => {
        if (live) setSupport(v);
      })
      .catch(() => {
        if (live) setSupport(false);
      });
    return () => {
      live = false;
    };
  }, [height, fps]);
  useEffect(() => {
    if (!result) return;
    const value = URL.createObjectURL(result);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [result]);
  useEffect(
    () => () => {
      clock.stopAt = null;
      sceneApi.setPreview("current");
      abort.current?.abort();
    },
    [],
  );
  const encode = async () => {
    if (start >= end || end > s.p.animation.duration) {
      setError("請設定有效的開始與結束時間");
      return;
    }
    setError("");
    setBusy(true);
    setProgress(0);
    abort.current = new AbortController();
    try {
      const blob = await exportVideo(
        options,
        setProgress,
        abort.current.signal,
      );
      setResult(blob);
      s.notify("MP4 已完成，可在影片面板預覽及下載");
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "已取消輸出"
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  const look = s.p.look;
  return (
    <>
      {busy && <div className="video-export-shield" />}
      <aside className="video-panel">
        <div className="video-title">
          <Film size={18} />
          <div>
            影片與電影視角<small>LOCAL MP4 RENDER</small>
          </div>
          <button disabled={busy} onClick={close}>
            <X size={17} />
          </button>
        </div>
        <div className="video-content">
          <div className="section-title">
            <span>光影與夜景</span>
            <em>即時生效</em>
          </div>
          <label className="switch-row">
            顯示編輯輔助線
            <input
              type="checkbox"
              disabled={busy}
              checked={look.helpers}
              onChange={(e) =>
                s.edit((p) => {
                  p.look.helpers = e.target.checked;
                })
              }
            />
          </label>
          <label className="switch-row">
            月光陰影與地面
            <input
              type="checkbox"
              disabled={busy}
              checked={look.shadows}
              onChange={(e) =>
                s.edit((p) => {
                  p.look.shadows = e.target.checked;
                })
              }
            />
          </label>
          <div className="two-fields">
            <NumberField
              label="發光暈染"
              value={look.bloom}
              min={0}
              max={3}
              disabled={busy}
              onChange={(n) =>
                s.edit((p) => {
                  p.look.bloom = n;
                })
              }
            />
            <NumberField
              label="曝光"
              value={look.exposure}
              min={0.2}
              max={3}
              disabled={busy}
              onChange={(n) =>
                s.edit((p) => {
                  p.look.exposure = n;
                })
              }
            />
          </div>
          <p className="helper">
            HDR
            發光、Bloom、月光陰影、地面光照及夜空。輸出自動隱藏網格、編號與選取圈。
          </p>
          <div className="section-title">
            <span>
              <Camera size={15} />
              Free cam 與鏡頭
            </span>
          </div>
          <label className="switch-row">
            自由飛行 WASD／Q E
            <input
              type="checkbox"
              disabled={busy}
              checked={fly}
              onChange={(e) => {
                sceneApi.fly = e.target.checked;
                setFly(e.target.checked);
                sceneApi.setPreview("current");
              }}
            />
          </label>
          <p className="helper">
            先點場景，再以 WASD 前後左右、Q/E 升降；Shift
            加速。滑鼠拖曳旋轉、滾輪縮放。以鏡頭影格記錄自由相機路線。
          </p>
          <select
            className="full"
            disabled={busy}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ShotMode);
              sceneApi.setPreview("current");
            }}
          >
            <option value="current">目前 Free cam 視角（固定鏡位）</option>
            <option value="orbit">自動 360° 環繞（全片一圈）</option>
            <option value="track">自由相機影格路線</option>
          </select>
          <button
            className="full"
            disabled={busy}
            onClick={() => {
              const pose = sceneApi.capture(),
                time = Number(clock.time.toFixed(3));
              s.edit((p) => {
                const key = p.cameras.find(
                  (k) => Math.abs(k.time - time) < 0.001,
                );
                if (key) Object.assign(key, pose);
                else p.cameras.push({ id: uid(), time, ...pose });
                p.cameras.sort((a, b) => a.time - b.time);
              });
            }}
          >
            <Plus size={14} />
            記錄鏡頭 · {time.toFixed(2)} s
          </button>
          <div className="camera-keys">
            {s.p.cameras.map((k) => (
              <div key={k.id}>
                <button
                  disabled={busy}
                  onClick={() => {
                    sceneApi.setPreview("track");
                    s.seek(k.time);
                  }}
                >
                  {k.time.toFixed(2)} s
                </button>
                <button
                  disabled={busy}
                  title="刪除鏡頭影格"
                  onClick={() =>
                    s.edit((p) => {
                      p.cameras = p.cameras.filter((x) => x.id !== k.id);
                    })
                  }
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="section-title">
            <span>影片輸出</span>
            <em>H.264 · MP4</em>
          </div>
          <div className="two-fields">
            <label className="number-field">
              <span>解析度</span>
              <select
                disabled={busy}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              >
                <option value={720}>1280 × 720</option>
                <option value={1080}>1920 × 1080</option>
              </select>
            </label>
            <label className="number-field">
              <span>影格率</span>
              <select
                disabled={busy}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
              >
                {[24, 30, 60].map((v) => (
                  <option key={v} value={v}>
                    {v} fps
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="開始時間 s"
              value={start}
              min={0}
              max={s.p.animation.duration}
              disabled={busy}
              onChange={setStart}
            />
            <NumberField
              label="結束時間 s"
              value={end}
              min={0}
              max={s.p.animation.duration}
              disabled={busy}
              onChange={setEnd}
            />
          </div>
          <p className={`codec-status ${support === false ? "caution" : ""}`}>
            {support === null
              ? "正在檢查編碼能力…"
              : support
                ? "● 此瀏覽器支援所選 MP4／H.264 規格"
                : "此瀏覽器無法編碼所選 MP4 規格"}
          </p>
          <button
            className="full"
            disabled={
              busy || start >= end || (mode === "track" && !s.p.cameras.length)
            }
            onClick={() => {
              sceneApi.setPreview(mode);
              clock.time = start;
              clock.stopAt = end;
              clock.playing = true;
              useStore.setState({ frame: null });
            }}
          >
            <Play size={14} />
            即時預覽鏡頭與燈光
          </button>
          <button
            className="primary full"
            disabled={
              busy ||
              support !== true ||
              start >= end ||
              (mode === "track" && !s.p.cameras.length)
            }
            onClick={encode}
          >
            <Film size={15} />
            {busy ? `輸出中 ${Math.round(progress * 100)}%` : "產生 MP4 影片"}
          </button>
          {busy && (
            <>
              <progress value={progress} max={1} />
              <button className="full" onClick={() => abort.current?.abort()}>
                取消輸出
              </button>
            </>
          )}
          {error && (
            <p className="caution" role="alert">
              {error}
            </p>
          )}
          {url && result && (
            <div className="video-result">
              <video src={url} controls playsInline preload="metadata" />
              <button
                className="accent full"
                onClick={() => download(result, `${s.p.name}-${height}p.mp4`)}
              >
                <Download size={14} />
                下載 MP4 · {(result.size / 1024 / 1024).toFixed(1)} MB
              </button>
            </div>
          )}
          <p className="helper">
            逐格離線渲染，影片時間不受即時 FPS
            或播放速度影響。純視覺影片，沒有音軌；輸出期間請保持此頁開啟。大型影片會使用較多記憶體。
          </p>
        </div>
      </aside>
    </>
  );
}
