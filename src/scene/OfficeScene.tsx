import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SecretId, SpotId } from "../content/site";
import type { ScoreKind } from "./ballInput";
import { isTouchDevice } from "./quality";
import { sideWallMaterial, wallMaterial } from "./materials";
import { Office, daylight } from "./Office";
import { OfficeCamera } from "./OfficeCamera";
import { SceneContext, type SceneApi } from "./Spot";
import { TickerOverlay } from "./TickerOverlay";
import { TourMarker } from "./TourMarker";

export interface SceneProps {
  focus: SpotId | null;
  day: boolean;
  onToggleDay: () => void;
  labelOf: (key: string) => string;
  onSelect: (spot: SpotId, slug?: string) => void;
  onHover: (label: string | null) => void;
  onSecret: (id: SecretId, x: number, y: number) => void;
  onScore: (kind: ScoreKind, x: number, y: number) => void;
  onReady: () => void;
  onFail: () => void;
  tourTarget: SpotId | null;
}

const lerp = THREE.MathUtils.lerp;

const COLORS = {
  backgroundDay: new THREE.Color("#c9d6e6"),
  backgroundNight: new THREE.Color("#25262a"),
  wallDay: new THREE.Color("#f2efe9"),
  wallNight: new THREE.Color("#9b9b98"),
  sideDay: new THREE.Color("#e8e4dc"),
  sideNight: new THREE.Color("#8b8b88"),
  skyDay: new THREE.Color("#ffffff"),
  skyNight: new THREE.Color("#c9c7c2"),
  groundDay: new THREE.Color("#c9b49c"),
  groundNight: new THREE.Color("#3f3a36"),
  sunDay: new THREE.Color("#fff1dc"),
  sunNight: new THREE.Color("#c4c6cc"),
};

/** Reflections for metal and glass, generated in code so nothing is downloaded. */
function Reflections() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const source = new RoomEnvironment();
    const target = generator.fromScene(source, 0.04);
    scene.environment = target.texture;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      generator.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}

/** Blends the whole office between artificial light and sunlight. */
function Lighting({ day, reduced, shadows, mapSize }: { day: boolean; reduced: boolean; shadows: boolean; mapSize: number }) {
  const scene = useThree((state) => state.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const background = useMemo(() => new THREE.Color(), []);
  const requestFrame = useThree((state) => state.invalidate);

  // The room only redraws on demand, so a change of light has to ask for it.
  useEffect(() => requestFrame(), [day, requestFrame]);

  useFrame(({ invalidate }, delta) => {
    const goal = day ? 1 : 0;
    daylight.value = reduced ? goal : THREE.MathUtils.damp(daylight.value, goal, 3.2, Math.min(delta, 0.05));
    if (Math.abs(daylight.value - goal) < 0.002) daylight.value = goal;
    else invalidate();
    const t = daylight.value;

    scene.background = background.lerpColors(COLORS.backgroundNight, COLORS.backgroundDay, t);
    scene.environmentIntensity = lerp(0.3, 0.5, t);
    wallMaterial.color.lerpColors(COLORS.wallNight, COLORS.wallDay, t);
    sideWallMaterial.color.lerpColors(COLORS.sideNight, COLORS.sideDay, t);
    if (hemi.current) {
      hemi.current.color.lerpColors(COLORS.skyNight, COLORS.skyDay, t);
      hemi.current.groundColor.lerpColors(COLORS.groundNight, COLORS.groundDay, t);
      hemi.current.intensity = lerp(0.62, 0.82, t);
    }
    if (sun.current) {
      sun.current.color.lerpColors(COLORS.sunNight, COLORS.sunDay, t);
      sun.current.intensity = lerp(0.35, 1.3, t);
    }
    if (lamp.current) lamp.current.intensity = lerp(5.5, 0.2, t);
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        position={[-5.5, 8, 9]}
        castShadow={shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={2}
        shadow-camera-far={24}
        shadow-bias={-0.0006}
        shadow-normalBias={0.018}
        shadow-radius={3}
      />
      <pointLight ref={lamp} position={[1.72, 1.36, 0.7]} color="#ffb765" distance={5} decay={1.6} />
    </>
  );
}

/** Open the site with ?perf to see live numbers, on any device. */
function PerfMeter() {
  const gl = useThree((state) => state.gl);
  const output = useRef<HTMLDivElement | null>(null);
  const stats = useRef({ frames: 0, last: performance.now() });

  useEffect(() => {
    const element = document.createElement("div");
    element.className = "perf-meter";
    document.body.appendChild(element);
    output.current = element;
    return () => element.remove();
  }, []);

  useFrame(({ invalidate }) => {
    const state = stats.current;
    state.frames += 1;
    const now = performance.now();
    if (now - state.last >= 500 && output.current) {
      const fps = Math.round((state.frames * 1000) / (now - state.last));
      output.current.textContent = `${fps} fps · ${gl.info.render.calls} draws · ${Math.round(gl.info.render.triangles / 1000)}k tris · ${gl.getPixelRatio().toFixed(2)}x`;
      state.frames = 0;
      state.last = now;
    }
    invalidate();
  });
  return null;
}

/** The sun never moves and neither does the furniture, so shadows render once. */
function BakeShadows({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    const timer = setTimeout(onReady, 160);
    // Bake again once textures and merged meshes have settled on the GPU.
    const rebake = [300, 1000].map((delay) =>
      setTimeout(() => {
        gl.shadowMap.needsUpdate = true;
        invalidate();
      }, delay),
    );
    return () => {
      clearTimeout(timer);
      rebake.forEach(clearTimeout);
    };
  }, [gl, invalidate, onReady]);
  return null;
}

export default function OfficeScene({ focus, day, onToggleDay, labelOf, onSelect, onHover, onSecret, onScore, onReady, onFail, tourTarget }: SceneProps) {
  const reduced = useMemo(() => matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const touch = isTouchDevice;
  const lowEnd = touch && (navigator.hardwareConcurrency ?? 8) <= 4;
  const dpr = Math.min(devicePixelRatio, lowEnd ? 1.25 : touch ? 1.75 : 2);
  const showPerf = useMemo(() => new URLSearchParams(location.search).has("perf"), []);
  const initialDay = useRef(day);
  if (daylight.value < 0) daylight.value = initialDay.current ? 1 : 0;

  const api = useMemo<SceneApi>(
    () => ({ focus, day, reduced, select: onSelect, toggleDay: onToggleDay, hover: onHover, secret: onSecret, score: onScore, labelOf }),
    [focus, day, reduced, onSelect, onToggleDay, onHover, onSecret, onScore, labelOf],
  );

  return (
    <Canvas
      className="room-canvas"
      frameloop="demand"
      dpr={dpr}
      shadows={lowEnd ? false : "percentage"}
      camera={{ fov: 24, near: 1, far: 70, position: [0, 3.2, 16] }}
      gl={{ antialias: !lowEnd, powerPreference: "high-performance", alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.02 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          // A canvas that already left the page is just being cleaned up.
          if (gl.domElement.isConnected) onFail();
        });
      }}
    >
      <Reflections />
      <Lighting day={day} reduced={reduced} shadows={!lowEnd} mapSize={touch ? 1024 : 2048} />
      <SceneContext.Provider value={api}>
        <Office />
      </SceneContext.Provider>
      <OfficeCamera focus={focus} reduced={reduced} />
      <TickerOverlay reduced={reduced} />
      <TourMarker target={tourTarget} />
      <BakeShadows onReady={onReady} />
      {showPerf && <PerfMeter />}
    </Canvas>
  );
}
