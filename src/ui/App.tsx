import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  Camera,
  Plus,
  BookOpen,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../state/store";
import { parseProject, exportProject, storageKey } from "../core/io";
import { demo } from "../core/demo";
import Scene, { takeScreenshot } from "../scene/Scene";
import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import Timeline from "./Timeline";
import VideoPanel from "./VideoPanel";
export default function App() {
  const s = useStore(),
    file = useRef<HTMLInputElement>(null),
    [help, setHelp] = useState(false),
    [saved, setSaved] = useState(false),
    [video, setVideo] = useState(false);
  useEffect(() => {
    setSaved(false);
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(s.p));
        setSaved(true);
      } catch {
        useStore
          .getState()
          .notify("本機儲存失敗：空間不足。請匯出 JSON 備份。");
      }
    }, 700);
    return () => clearTimeout(id);
  }, [s.p]);
  useEffect(() => {
    if (!s.message) return;
    const timer = setTimeout(() => useStore.getState().notify(""), 6000);
    return () => clearTimeout(timer);
  }, [s.message]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">✣</div>
          <strong>
            AERIS<span>DRONE SHOW STUDIO</span>
          </strong>
          <em>MVP 1.0</em>
        </div>
        <div className="project-title">
          <input
            aria-label="專案名稱"
            value={s.p.name}
            onChange={(e) => {
              const name = e.target.value;
              if (name.trim())
                s.edit((p) => {
                  p.name = name;
                });
            }}
          />
          <ChevronDown size={13} />
          <span>
            {saved ? (
              <>
                <Check size={12} />
                已暫存本機
              </>
            ) : (
              "儲存中…"
            )}
          </span>
        </div>
        <nav>
          <a
            className="repository-link"
            href="https://github.com/xc1974/aeris-drone-studio"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <button
            onClick={() => {
              if (confirm("建立新專案？目前設計請先匯出 JSON。")) {
                const p = demo(100);
                p.name = "未命名專案";
                p.frames = [p.frames[0]];
                p.drones.forEach((d) => (d.lights = []));
                p.effects = [];
                p.groups = [];
                s.load(p);
              }
            }}
          >
            <Plus size={15} />
            新增
          </button>
          <button onClick={() => file.current?.click()}>
            <FolderOpen size={15} />
            開啟
          </button>
          <button
            onClick={() => {
              try {
                localStorage.setItem(storageKey, JSON.stringify(s.p));
                s.notify("已儲存至此瀏覽器");
              } catch {
                s.notify("儲存空間不足，請匯出 JSON");
              }
            }}
          >
            <Save size={15} />
            儲存
          </button>
          <button className="export-button" onClick={() => exportProject(s.p)}>
            <Download size={15} />
            匯出 JSON
          </button>
          <span className="nav-divider" />
          <button
            title="復原 Ctrl+Z"
            disabled={!s.past.length}
            onClick={s.undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            title="重做 Ctrl+Shift+Z"
            disabled={!s.future.length}
            onClick={s.redo}
          >
            <Redo2 size={16} />
          </button>
          <button title="操作說明" onClick={() => setHelp(true)}>
            <BookOpen size={16} />
          </button>
        </nav>
        <input
          type="file"
          accept=".json,application/json"
          hidden
          ref={file}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 30_000_000) throw new Error("檔案超過 30 MB");
              s.load(parseProject(await f.text()));
            } catch (error) {
              s.notify((error as Error).message);
            }
            e.target.value = "";
          }}
        />
      </header>
      <div className="workspace-bar">
        <div>
          <span className="workspace-dot" />
          設計工作區 <span className="breadcrumb">／</span>
          <span className="muted">{s.p.name}</span>
        </div>
        <div className="scene-options">
          <label>
            <input
              type="checkbox"
              checked={s.p.scene.labels}
              onChange={(e) =>
                s.edit((p) => {
                  p.scene.labels = e.target.checked;
                })
              }
            />
            編號（前100架）
          </label>
          <label>
            <input
              type="checkbox"
              checked={s.p.scene.trails}
              onChange={(e) =>
                s.edit((p) => {
                  p.scene.trails = e.target.checked;
                })
              }
            />
            飛行軌跡
          </label>
          <button className="video-open" onClick={() => setVideo((v) => !v)}>
            ▶ 影片／MP4
          </button>
          <button onClick={() => takeScreenshot()}>
            <Camera size={14} />
            匯出 PNG
          </button>
        </div>
      </div>
      <main className="workspace">
        <Sidebar />
        <Scene />
        <Inspector />
      </main>
      <Timeline />
      <div className="statusbar">
        <span>
          <i className="live-dot" />
          本機模擬 · 無實體連線
        </span>
        <span>
          {s.p.drones.length} 架無人機 <b>·</b> {s.p.frames.length} 個位置影格{" "}
          <b>·</b> {s.p.drones.reduce((n, d) => n + d.lights.length, 0)}{" "}
          個燈光影格
        </span>
        <span>WebGL · Y ↑ · m / s</span>
      </div>
      {video && <VideoPanel close={() => setVideo(false)} />}
      {s.message && (
        <div className="toast" role="status">
          {s.message}
          <button onClick={() => s.notify("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <article className="help-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setHelp(false)}>
              <X size={18} />
            </button>
            <span className="eyebrow">QUICK START</span>
            <h2>讓想像，在空中成形。</h2>
            <p>
              按下播放即可觀看「方形 → 圓形 →
              愛心」。在底部細軌拖曳播放頭，位置與獨立燈光會一起還原。
            </p>
            <ol>
              <li>
                點選位置軌道的菱形，再選取無人機，輸入 XYZ 或拖曳 3D 箭頭。Y
                為高度，距離單位公尺。
              </li>
              <li>
                Shift／Ctrl 點選可多選。右側位置為絕對座標；相對位移與 3D
                拖曳會保留物件間距。
              </li>
              <li>
                燈光修改在播放頭時間寫入各架獨立影格；顏色、亮度、電源只改該欄位。首燈光影格前使用預設燈光，最後之後保持尾端狀態。
              </li>
              <li>
                點選燈光菱形可移動、複製、刪除並選擇插值。電源在到達影格時切換，淡入淡出請用亮度。
              </li>
              <li>
                群組按鈕會選取成員；效果寫成各架資料。效果區間內的舊影格會被取代，可復原。
              </li>
              <li>
                增加無人機：在所有位置影格加入相同待命位置，燈光預設青色。減少數量移除清單尾端；刪除同步清理影格、群組與效果成員。
              </li>
              <li>
                JSON 保存完整專案；PNG 僅包含目前 3D
                視角。自動暫存保存在目前瀏覽器。
              </li>
            </ol>
            <p className="caution">
              僅供視覺設計。間距提示為 10 Hz
              離散取樣，不代表實際飛行安全認證；路徑插值沒有避碰或 ID 重新分配。
            </p>
            <button
              className="primary"
              onClick={() => {
                s.load(demo());
                setHelp(false);
              }}
            >
              重新載入 100 架示範
            </button>
          </article>
        </div>
      )}
    </div>
  );
}
