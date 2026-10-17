import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  Layers,
  Grid2X2,
  Circle,
  Heart,
  Orbit,
  Box,
  Minus,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../state/store";
import { formation, defaultParams } from "../core/formations";
import { positionAt, lightAt, clock } from "../core/engine";
import type { Formation } from "../core/types";
import { uid } from "../core/types";
import { NumberField, names, useTime } from "./common";
export default function Sidebar() {
  const s = useStore(),
    [count, setCount] = useState(s.p.drones.length),
    [query, setQuery] = useState(""),
    [type, setType] = useState<Formation>("circle"),
    [params, setParams] = useState(defaultParams),
    [groupName, setGroupName] = useState(""),
    [formationColor, setFormationColor] = useState("#67ddff");
  const time = useTime();
  const types: Formation[] = [
    "line",
    "grid",
    "circle",
    "helix",
    "sphere",
    "heart",
  ];
  const icons = [Minus, Grid2X2, Circle, Orbit, Box, Heart];
  useEffect(() => setCount(s.p.drones.length), [s.p.drones.length]);
  return (
    <aside className="left-panel">
      <section>
        <div className="section-title">
          <span>
            <Layers size={15} />
            無人機
          </span>
          <em>{s.p.drones.length} 架</em>
        </div>
        <div className="count-row">
          <NumberField
            value={count}
            min={1}
            max={500}
            step={1}
            onChange={setCount}
            label="總數"
          />
          <button onClick={() => s.count(count)}>套用</button>
        </div>
        <div className="preset-row">
          測試數量{" "}
          {[100, 300, 500].map((n) => (
            <button
              key={n}
              onClick={() => {
                setCount(n);
                s.count(n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="list-tools">
          <label className="search">
            <Search size={13} />
            <input
              placeholder="搜尋無人機 ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            title="新增單架"
            onClick={() => {
              s.count(s.p.drones.length + 1);
              setCount(s.p.drones.length + 1);
            }}
          >
            <Plus size={14} />
          </button>
          <button
            title="刪除選取"
            disabled={!s.selected.length}
            onClick={s.remove}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="list-header">
          <span>無人機 ID</span>
          <span>高度 Y</span>
        </div>
        <div className="drone-list">
          {s.p.drones
            .filter((d) => d.id.toLowerCase().includes(query.toLowerCase()))
            .map((d) => {
              const l = lightAt(d, time);
              return (
                <button
                  className={`drone-row ${s.selected.includes(d.id) ? "selected" : ""}`}
                  key={d.id}
                  onClick={(e) =>
                    s.select(d.id, e.shiftKey || e.ctrlKey || e.metaKey)
                  }
                  title={positionAt(s.p, d.id, time)
                    .map((n) => n.toFixed(2))
                    .join(", ")}
                >
                  <span>
                    <i
                      style={{
                        background: l.on ? l.color : "#354052",
                        opacity: l.on ? Math.max(0.2, l.brightness) : 1,
                      }}
                    />
                    {d.id}
                  </span>
                  <span>
                    {positionAt(s.p, d.id, time)[1].toFixed(1)} <small>m</small>
                  </span>
                </button>
              );
            })}
        </div>
        <div className="selection-row">
          <span>已選 {s.selected.length} 架</span>
          <button
            onClick={() =>
              useStore.setState({ selected: s.p.drones.map((d) => d.id) })
            }
          >
            全選
          </button>
          <button onClick={() => useStore.setState({ selected: [] })}>
            清除
          </button>
        </div>
      </section>
      <section className="formation-section">
        <div className="section-title">
          <span>
            <Grid2X2 size={15} />
            隊形產生器
          </span>
          <ChevronDown size={14} />
        </div>
        <div className="formation-grid">
          {types.map((t, i) => {
            const Icon = icons[i];
            return (
              <button
                key={t}
                className={type === t ? "chosen" : ""}
                onClick={() => setType(t)}
              >
                <Icon size={22} />
                {names[t]}
              </button>
            );
          })}
        </div>
        <div className="field-label">
          中心位置 <small>m</small>
        </div>
        <div className="xyz">
          {params.center.map((v, i) => (
            <NumberField
              key={i}
              value={v}
              label={["X", "Y 高度", "Z"][i]}
              onChange={(n) =>
                setParams({
                  ...params,
                  center: params.center.map((a, k) => (k === i ? n : a)) as [
                    number,
                    number,
                    number,
                  ],
                })
              }
            />
          ))}
        </div>
        <div className="two-fields">
          {(type === "circle" || type === "sphere" || type === "helix") && (
            <NumberField
              label="半徑 m"
              min={0.1}
              max={1000}
              value={params.radius}
              onChange={(radius) => setParams({ ...params, radius })}
            />
          )}{" "}
          {(type === "grid" || type === "heart") && (
            <NumberField
              label="寬度 m"
              min={0.1}
              max={1000}
              value={params.width}
              onChange={(width) => setParams({ ...params, width })}
            />
          )}{" "}
          {(type === "grid" || type === "heart" || type === "helix") && (
            <NumberField
              label="高度／深度 m"
              min={0.1}
              max={1000}
              value={params.height}
              onChange={(height) => setParams({ ...params, height })}
            />
          )}{" "}
          {type === "line" && (
            <NumberField
              label="間距 m"
              min={0.1}
              max={100}
              value={params.spacing}
              onChange={(spacing) => setParams({ ...params, spacing })}
            />
          )}
          <NumberField
            label="旋轉 Y°"
            value={params.rotation}
            min={-360}
            max={360}
            onChange={(rotation) => setParams({ ...params, rotation })}
          />
        </div>
        <button
          className="primary full"
          disabled={!s.frame || clock.playing}
          onClick={() => {
            formation(type, s.p.drones.length, params);
            s.generate(type, params);
          }}
        >
          產生隊形 <span>↗</span>
        </button>
        <p className="helper">套用至選取的位置影格，保留各架燈光。</p>
        <label className="color-inline">
          隊形整體燈光
          <input
            type="color"
            value={formationColor}
            onChange={(e) => setFormationColor(e.target.value)}
          />
          <button
            onClick={() => {
              const selected = s.p.drones.map((d) => d.id);
              useStore.setState({ selected });
              useStore.getState().lights({ color: formationColor });
            }}
          >
            寫入全部
          </button>
        </label>
      </section>
      <section>
        <div className="section-title">
          <span>
            <Layers size={15} />
            群組
          </span>
        </div>
        {s.p.groups.map((g) => (
          <div className="group-row" key={g.id}>
            <button
              onClick={() => useStore.setState({ selected: [...g.members] })}
            >
              <i />
              {g.name}
              <small>{g.members.length}</small>
            </button>
            <button
              title="重新命名群組"
              onClick={() => {
                const name = prompt("群組名稱", g.name);
                if (name?.trim())
                  s.edit((p) => {
                    p.groups.find((x) => x.id === g.id)!.name = name.trim();
                  });
              }}
            >
              ✎
            </button>
            <button
              title="刪除群組"
              onClick={() =>
                s.edit((p) => {
                  p.groups = p.groups.filter((x) => x.id !== g.id);
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <div className="count-row">
          <input
            placeholder="以選取物件建立群組"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button
            disabled={!s.selected.length || !groupName.trim()}
            onClick={() => {
              s.edit((p) =>
                p.groups.push({
                  id: uid(),
                  name: groupName.trim(),
                  members: [...s.selected],
                }),
              );
              setGroupName("");
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </section>
    </aside>
  );
}
