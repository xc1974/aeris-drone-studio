import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { sceneApi, cameraAt, type ShotMode } from "./api";
import { useStore } from "../state/store";
import {
  advance,
  clock,
  positionAt,
  lightAt,
  closePairs,
} from "../core/engine";
import { download } from "../core/io";
export let takeScreenshot = () => {};
function label(text: string, color = "#8192ad") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "28px system-ui";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 40);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    }),
  );
  sprite.scale.set(5, 1.25, 1);
  return sprite;
}
export default function Scene() {
  const host = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ fps: 0, ms: 0, pairs: 0, time: 0 });
  const p = useStore((s) => s.p),
    frame = useStore((s) => s.frame),
    selected = useStore((s) => s.selected);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      useStore.getState().notify("無法啟動 WebGL，請啟用瀏覽器硬體加速");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#090f1c");
    renderer.domElement.tabIndex = 0;
    el.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#090f1c", 110, 240);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 1000);
    camera.position.set(50, 48, 65);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 17, 0);
    orbit.enableDamping = true;
    orbit.maxDistance = 220;
    orbit.minDistance = 8;
    const guides = new THREE.Group();
    scene.add(guides);
    guides.add(new THREE.GridHelper(160, 40, "#33445e", "#19263a"));
    guides.add(new THREE.AxesHelper(10));
    for (let y = 0; y <= 60; y += 10) {
      const s = label(`${y} m`);
      s.position.set(-32, y, -24);
      guides.add(s);
    }
    const axes = label("Y ↑ 高度", "#6ce7cf");
    axes.position.set(-32, 66, -24);
    guides.add(axes);
    const ruler = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-32, 0, -24),
        new THREE.Vector3(-32, 60, -24),
      ]),
      new THREE.LineBasicMaterial({ color: "#31445b" }),
    );
    guides.add(ruler);
    scene.add(new THREE.HemisphereLight("#6e8fbf", "#171424", 1.4));
    const moon = new THREE.DirectionalLight("#adcaff", 2);
    moon.position.set(25, 70, 25);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, {
      left: -70,
      right: 70,
      top: 70,
      bottom: -70,
      near: 1,
      far: 160,
    });
    moon.shadow.bias = -0.0002;
    scene.add(moon);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({
        color: "#101c2e",
        metalness: 0.35,
        roughness: 0.45,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    scene.add(ground);
    for (const [x, z, c] of [
      [-35, -25, "#548cff"],
      [35, 25, "#af6cff"],
    ] as const) {
      const spot = new THREE.SpotLight(c, 1500, 160, Math.PI / 3, 1, 1.5);
      spot.position.set(x, 35, z);
      spot.target.position.set(0, 0, 0);
      scene.add(spot, spot.target);
    }
    const stars = new THREE.BufferGeometry(),
      starPos = [];
    for (let i = 0; i < 600; i++) {
      starPos.push(
        Math.sin(i * 17.3) * 180,
        55 + Math.abs(Math.cos(i * 8.71)) * 100,
        Math.cos(i * 29.7) * 180,
      );
    }
    stars.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPos, 3),
    );
    scene.add(
      new THREE.Points(
        stars,
        new THREE.PointsMaterial({
          color: "#8093b5",
          size: 0.15,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.1, 0.55, 0.5);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const geo = new THREE.SphereGeometry(1, 12, 8),
      bodyMat = new THREE.MeshStandardMaterial({
        color: "#788ba4",
        metalness: 0.5,
        roughness: 0.6,
      }),
      lightMat = new THREE.MeshBasicMaterial({
        color: "white",
        toneMapped: false,
      }),
      haloMat = new THREE.MeshBasicMaterial({
        color: "white",
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    const bodies = new THREE.InstancedMesh(geo, bodyMat, 500),
      lights = new THREE.InstancedMesh(geo, lightMat, 500),
      halos = new THREE.InstancedMesh(geo, haloMat, 500);
    bodies.castShadow = true;
    const rings = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.55, 0.025, 6, 24),
      new THREE.MeshBasicMaterial({ color: "white", depthTest: false }),
      500,
    );
    rings.renderOrder = 5;
    [bodies, lights, halos, rings].forEach((mesh) => {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    });
    const object = new THREE.Object3D(),
      color = new THREE.Color(),
      ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    const pivot = new THREE.Object3D();
    scene.add(pivot);
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate");
    transform.setSize(0.8);
    scene.add(transform.getHelper());
    let dragging = false,
      dragOrigin = new THREE.Vector3(),
      offset = new THREE.Vector3();
    transform.addEventListener("dragging-changed", (event) => {
      dragging = Boolean(event.value);
      orbit.enabled = !dragging;
      if (dragging) {
        dragOrigin.copy(pivot.position);
        clock.playing = false;
      } else {
        offset.subVectors(pivot.position, dragOrigin);
        if (offset.lengthSq() > 1e-10)
          useStore
            .getState()
            .positions({ 0: offset.x, 1: offset.y, 2: offset.z }, true);
        offset.set(0, 0, 0);
      }
    });
    let trails = new THREE.Group(),
      labels = new THREE.Group(),
      lastView = "";
    scene.add(trails, labels);
    const disposeGroup = (group: THREE.Group) => {
      group.traverse((o) => {
        if (o instanceof THREE.Line || o instanceof THREE.Sprite) {
          o.geometry?.dispose();
          const mat = o.material as THREE.Material & { map?: THREE.Texture };
          mat.map?.dispose();
          mat.dispose();
        }
      });
      group.clear();
    };
    function sync() {
      const s = useStore.getState(),
        p = s.p;
      if (p.scene.view !== lastView) {
        const views = {
          free: [50, 48, 65],
          top: [0, 100, 0.01],
          front: [0, 25, 95],
          side: [95, 25, 0],
        };
        camera.position.fromArray(views[p.scene.view]);
        orbit.target.set(0, 17, 0);
        orbit.update();
        lastView = p.scene.view;
      }
      disposeGroup(trails);
      disposeGroup(labels);
      if (p.scene.trails)
        p.drones.forEach((d) => {
          const points: THREE.Vector3[] = [];
          for (let i = 0; i < p.frames.length - 1; i++)
            for (let j = 0; j <= 20; j++) {
              const t =
                p.frames[i].time +
                ((p.frames[i + 1].time - p.frames[i].time) * j) / 20;
              points.push(new THREE.Vector3(...positionAt(p, d.id, t)));
            }
          if (points.length > 1)
            trails.add(
              new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points),
                new THREE.LineBasicMaterial({
                  color: s.selected.includes(d.id) ? "#83dbff" : "#304762",
                  transparent: true,
                  opacity: 0.45,
                }),
              ),
            );
        });
      if (p.scene.labels)
        p.drones.slice(0, 100).forEach((d) => {
          const spr = label(d.id);
          spr.userData.id = d.id;
          labels.add(spr);
        });
      if (s.selected.length && s.frame && !clock.playing) {
        pivot.position.fromArray(positionAt(p, s.selected[0], clock.time));
        transform.attach(pivot);
      } else transform.detach();
    }
    const unsub = useStore.subscribe(sync);
    sync();
    let down = [0, 0];
    const onDown = (e: PointerEvent) => {
      renderer.domElement.focus();
      down = [e.clientX, e.clientY];
    };
    const onClick = (e: PointerEvent) => {
      if (
        dragging ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 ||
        transform.axis
      )
        return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObject(bodies)[0];
      if (hit?.instanceId !== undefined) {
        const d = useStore.getState().p.drones[hit.instanceId];
        if (d)
          useStore
            .getState()
            .select(d.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onClick);
    let exporting = false,
      shot: ShotMode = "current",
      basePosition = camera.position.clone(),
      baseTarget = orbit.target.clone(),
      savedPreview: ShotMode = "current",
      savedPosition = camera.position.clone(),
      savedTarget = orbit.target.clone();
    const resizeNow = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resize = new ResizeObserver(() => {
      if (!exporting) resizeNow();
    });
    resize.observe(el);
    sceneApi.canvas = renderer.domElement;
    sceneApi.capture = () => ({
      position: camera.position.toArray() as [number, number, number],
      target: orbit.target.toArray() as [number, number, number],
    });
    sceneApi.setPreview = (mode) => {
      basePosition.copy(camera.position);
      baseTarget.copy(orbit.target);
      sceneApi.preview = mode;
    };
    sceneApi.begin = (w, h, mode) => {
      if (exporting) throw new Error("已有影片正在輸出");
      exporting = true;
      shot = mode;
      savedPreview = sceneApi.preview;
      savedPosition.copy(camera.position);
      savedTarget.copy(orbit.target);
      if (mode === "current" || sceneApi.preview !== mode) {
        basePosition.copy(camera.position);
        baseTarget.copy(orbit.target);
      }
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      composer.setPixelRatio(1);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      transform.detach();
    };
    sceneApi.draw = (time) => {
      clock.time = time;
      render(performance.now(), true);
    };
    sceneApi.end = () => {
      exporting = false;
      camera.position.copy(savedPosition);
      orbit.target.copy(savedTarget);
      sceneApi.preview = savedPreview;
      resizeNow();
      sync();
    };
    takeScreenshot = () => {
      composer.render();
      renderer.domElement.toBlob((blob) => {
        if (blob) download(blob, "AERIS-場景.png");
      }, "image/png");
    };
    const held = new Set<string>();
    const keyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      held.add(e.code);
    };
    const keyUp = (e: KeyboardEvent) => held.delete(e.code),
      clearKeys = () => held.clear();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);
    let raf = 0,
      prev = performance.now(),
      report = prev,
      frames = 0,
      flagged = new Set<number>(),
      pairs = 0,
      lastCheck = -1,
      cost = 0;
    function render(now: number, oneShot = false) {
      if (exporting && !oneShot) {
        prev = now;
        raf = requestAnimationFrame(render);
        return;
      }
      const delta = (now - prev) / 1000;
      prev = now;
      const s = useStore.getState(),
        p = s.p;
      if (!oneShot) advance(p, delta);
      if (clock.playing) transform.detach();
      const look = p.look || {
        bloom: 1.1,
        exposure: 1,
        shadows: true,
        helpers: true,
      };
      bloom.strength = look.bloom;
      bloom.enabled = look.bloom > 0;
      renderer.toneMappingExposure = look.exposure;
      moon.castShadow = look.shadows;
      const mode = oneShot ? shot : sceneApi.preview;
      if (mode === "orbit") {
        const v = basePosition.clone().sub(baseTarget);
        v.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (clock.time / p.animation.duration) * Math.PI * 2,
        );
        camera.position.copy(baseTarget).add(v);
        orbit.target.copy(baseTarget);
      }
      if (mode === "track") {
        const k = cameraAt(p.cameras || [], clock.time);
        if (k) {
          camera.position.fromArray(k.position);
          orbit.target.fromArray(k.target);
        }
      }
      if (sceneApi.fly && mode === "current" && !oneShot) {
        const amount = Math.min(delta, 0.1) * (held.has("ShiftLeft") ? 35 : 12);
        const direction = new THREE.Vector3(
          Number(held.has("KeyD")) - Number(held.has("KeyA")),
          0,
          Number(held.has("KeyS")) - Number(held.has("KeyW")),
        ).applyQuaternion(camera.quaternion);
        direction.y += Number(held.has("KeyE")) - Number(held.has("KeyQ"));
        direction.multiplyScalar(amount);
        camera.position.add(direction);
        orbit.target.add(direction);
      }
      orbit.enableDamping = !oneShot && mode === "current";
      orbit.enabled = !exporting && !dragging && mode === "current";
      orbit.update();
      const clean = oneShot || !look.helpers;
      guides.visible = !clean;
      trails.visible = !clean;
      labels.visible = !clean;
      rings.visible = !clean;
      transform.getHelper().visible = !clean && Boolean(transform.object);
      const positions = p.drones.map((d) => positionAt(p, d.id, clock.time));
      if (now - lastCheck > 100) {
        const started = performance.now();
        const result = closePairs(positions, p.scene.minDistance);
        flagged = result.flagged;
        pairs = result.pairs;
        cost = performance.now() - started;
        lastCheck = now;
      }
      if (dragging) offset.subVectors(pivot.position, dragOrigin);
      [bodies, lights, halos, rings].forEach(
        (m) => (m.count = p.drones.length),
      );
      p.drones.forEach((d, i) => {
        const l = lightAt(d, clock.time),
          isSelected = s.selected.includes(d.id);
        object.position.fromArray(positions[i]);
        if (dragging && isSelected) object.position.add(offset);
        object.quaternion.identity();
        object.scale.setScalar(0.24);
        object.updateMatrix();
        bodies.setMatrixAt(i, object.matrix);
        bodies.setColorAt(i, color.set("#34445d"));
        object.scale.setScalar(l.on && l.brightness > 0 ? 0.31 : 0.001);
        object.updateMatrix();
        lights.setMatrixAt(i, object.matrix);
        color.set(l.color).multiplyScalar(l.brightness * 1.8);
        lights.setColorAt(i, color);
        object.scale.setScalar(l.on ? 0.95 * l.brightness : 0.001);
        object.updateMatrix();
        halos.setMatrixAt(i, object.matrix);
        halos.setColorAt(i, color);
        object.quaternion.copy(camera.quaternion);
        object.scale.setScalar(isSelected || flagged.has(i) ? 1 : 0.001);
        object.updateMatrix();
        rings.setMatrixAt(i, object.matrix);
        rings.setColorAt(i, color.set(flagged.has(i) ? "#ff597c" : "#cbfff0"));
      });
      [bodies, lights, halos, rings].forEach((m) => {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      });
      labels.children.forEach((spr) => {
        const pos = positionAt(p, spr.userData.id, clock.time);
        spr.position.set(pos[0], pos[1] + 1.2, pos[2]);
      });
      composer.render();
      frames++;
      if (now - report > 250) {
        setStats({
          fps: Math.round((frames * 1000) / (now - report)),
          ms: cost,
          pairs,
          time: clock.time,
        });
        report = now;
        frames = 0;
      }
      if (!oneShot) raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      sceneApi.canvas = null;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
      composer.dispose();
      bloom.dispose();
      moon.shadow.dispose();
      unsub();
      resize.disconnect();
      orbit.dispose();
      transform.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onClick);
      disposeGroup(trails);
      disposeGroup(labels);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
        if (o instanceof THREE.Sprite) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      takeScreenshot = () => {};
    };
  }, []);
  return (
    <div className="scene-shell">
      <div ref={host} className="scene-canvas" />
      <div className="scene-top">
        <div className="viewport-label">
          <span className="live-dot" />
          即時預覽 <small>／ PERSPECTIVE</small>
        </div>
        <div className="segmented">
          {(["free", "top", "front", "side"] as const).map((v, i) => (
            <button
              key={v}
              className={p.scene.view === v ? "active" : ""}
              onClick={() =>
                useStore.getState().edit((p) => {
                  p.scene.view = v;
                })
              }
            >
              {["自由", "俯視", "正視", "側視"][i]}
            </button>
          ))}
        </div>
      </div>
      <div className="scene-bottom">
        <span>拖曳旋轉 · 滾輪縮放 · 右鍵平移 · Shift 多選</span>
        <span>
          <b>{stats.fps}</b> FPS <i /> 檢查 {stats.ms.toFixed(1)} ms
        </span>
      </div>
      <div className="scene-coordinates">
        <span className="x">X</span>
        <span className="y">Y ↑</span>
        <span className="z">Z</span>
        <small>公尺 · Y 軸高度</small>
      </div>
      <div className={`distance-badge ${stats.pairs ? "warning" : ""}`}>
        <span className="live-dot" />
        {stats.pairs ? `${stats.pairs} 組間距不足` : "目前取樣間距正常"}
        <small>門檻 {p.scene.minDistance} m · 10 Hz 離散取樣</small>
      </div>
      {!frame && (
        <div className="edit-hint">預覽模式 · 選取位置影格後即可編輯隊形</div>
      )}
      {frame && selected.length > 0 && (
        <div className="edit-hint">
          已選取 {selected.length} 架 · 拖曳座標箭頭批次移動
        </div>
      )}
    </div>
  );
}
