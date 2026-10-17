import { sceneApi, type ShotMode } from "../scene/api";
import { clock } from "./engine";
export interface VideoOptions {
  width: number;
  height: number;
  fps: number;
  start: number;
  end: number;
  mode: ShotMode;
}
export async function checkVideo(o: VideoOptions) {
  const { canEncodeVideo, Quality } = await import("mediabunny");
  return canEncodeVideo("avc", {
    width: o.width,
    height: o.height,
    frameRate: o.fps,
    quality: new Quality({ bitrate: o.width * o.height * o.fps * 0.17 }),
  });
}
export async function exportVideo(
  o: VideoOptions,
  onProgress: (value: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (!sceneApi.canvas) throw new Error("3D 場景尚未就緒");
  if (!Number.isFinite(o.start) || !Number.isFinite(o.end) || o.end <= o.start)
    throw new Error("影片結束時間必須大於開始時間");
  if (!(await checkVideo(o)))
    throw new Error(
      "此瀏覽器不支援所選規格的 H.264／MP4 編碼，請使用具 WebCodecs 支援的 Chrome／Edge 或降低解析度。",
    );
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality } =
    await import("mediabunny");
  const target = new BufferTarget(),
    output = new Output({ format: new Mp4OutputFormat(), target });
  const oldTime = clock.time,
    wasPlaying = clock.playing;
  clock.playing = false;
  let started = false;
  try {
    sceneApi.begin(o.width, o.height, o.mode);
    started = true;
    const source = new CanvasSource(sceneApi.canvas, {
      codec: "avc",
      quality: new Quality({ bitrate: o.width * o.height * o.fps * 0.17 }),
    });
    output.addVideoTrack(source, { frameRate: o.fps });
    await output.start();
    const count = Math.ceil((o.end - o.start) * o.fps);
    for (let i = 0; i < count; i++) {
      if (signal.aborted) throw new DOMException("已取消輸出", "AbortError");
      const timestamp = i / o.fps;
      sceneApi.draw(o.start + timestamp);
      await source.add(
        timestamp,
        Math.min(1 / o.fps, o.end - o.start - timestamp),
      );
      if (i % 4 === 0) {
        onProgress(i / count);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    source.close();
    await output.finalize();
    onProgress(1);
    if (!target.buffer) throw new Error("影片封裝失敗");
    return new Blob([new Uint8Array(target.buffer)], { type: "video/mp4" });
  } catch (e) {
    if (output.state !== "finalized" && output.state !== "canceled")
      await output.cancel();
    throw e;
  } finally {
    clock.time = oldTime;
    clock.playing = wasPlaying;
    if (started) sceneApi.end();
  }
}
