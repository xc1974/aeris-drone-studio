import { useEffect, useState } from "react";
import { clock } from "../core/engine";
export function useTime() {
  const [value, setValue] = useState(clock.time);
  useEffect(() => {
    const id = setInterval(() => setValue(clock.time), 100);
    return () => clearInterval(id);
  }, []);
  return value;
}
export function NumberField({
  value,
  onChange,
  min = -10000,
  max = 10000,
  step = 0.1,
  disabled = false,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
}) {
  const [text, setText] = useState(String(Number(value.toFixed(3))));
  useEffect(() => setText(String(Number(value.toFixed(3)))), [value]);
  return (
    <label className="number-field">
      {label && <span>{label}</span>}
      <input
        aria-label={label}
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text.trim() && Number.isFinite(n) && n >= min && n <= max)
            onChange(n);
          else setText(String(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export const names = {
  line: "直線",
  grid: "矩形網格",
  circle: "圓形",
  helix: "螺旋",
  sphere: "球體表面",
  heart: "愛心",
};
