export type Vec3 = [number, number, number];
export type Ease = "linear" | "smooth";
export type LightEase = Ease | "step";
export interface Light {
  on: boolean;
  color: string;
  brightness: number;
}
export interface LightKey extends Light {
  id: string;
  time: number;
  easing: LightEase;
}
export interface Drone {
  id: string;
  light: Light;
  lights: LightKey[];
}
export interface PositionKey {
  id: string;
  name: string;
  time: number;
  easing: Ease;
  positions: Record<string, Vec3>;
}
export interface Group {
  id: string;
  name: string;
  members: string[];
}
export interface CameraKey {
  id: string;
  time: number;
  position: Vec3;
  target: Vec3;
}
export interface Look {
  bloom: number;
  exposure: number;
  shadows: boolean;
  helpers: boolean;
}
export type EffectType =
  "fixed" | "fadeIn" | "fadeOut" | "blink" | "breathe" | "rainbow" | "chase";
export interface Effect {
  id: string;
  type: EffectType;
  members: string[];
  start: number;
  duration: number;
  color: string;
  brightness: number;
  period: number;
  delay: number;
}
export interface Project {
  cameras: CameraKey[];
  look: Look;
  version: 1;
  name: string;
  drones: Drone[];
  frames: PositionKey[];
  groups: Group[];
  effects: Effect[];
  animation: { duration: number; loop: boolean; speed: number };
  scene: {
    minDistance: number;
    labels: boolean;
    trails: boolean;
    view: "free" | "top" | "front" | "side";
  };
}
export type Formation =
  "line" | "grid" | "circle" | "helix" | "sphere" | "heart";
export interface FormationParams {
  center: Vec3;
  width: number;
  height: number;
  radius: number;
  spacing: number;
  rotation: number;
}
export const uid = () => crypto.randomUUID();
