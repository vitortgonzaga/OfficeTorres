import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import {
  blobTexture,
  glowTexture,
  edgeTexture,
  makeFloorMaterial,
  makeSlatMaterial,
  makeSunPatch,
  mat,
  prepareWalls,
  sideWallMaterial,
  wallMaterial,
} from "./materials";
import type { SecretId } from "../content/site";
import { FEATURES } from "../features";
import { ballInput, ballIsBusy, chairPose, dogAlert, wakeDogs } from "./ballInput";
import { OutsideView } from "./OutsideView";
import { TICKER, TICKER_REPEAT, tickerPhase } from "./TickerOverlay";
import { Balls, GOAL, HOOP } from "./Balls";
import { B, Ball, Cyl, Extruded, Fuzzy, Leaf, Merged, Ring, Tube, Tufts, Turned, type TuftPatch, type V3, Shaped } from "./parts";
import { Hotspot, useSceneApi, useTapHandlers } from "./Spot";
import {
  drawCertificate,
  drawCork,
  drawDiploma,
  drawStackBanner,
  drawPaper,
  drawPhone,
  drawRainbowRing,
  drawRainbowStrip,
  drawResume,
  drawMonitorHome,
  MONITOR_APPS,
  MONITOR_APP_Y,
  drawTicker,
  makeTexture,
  redraw,
  drawHiddenNote,
  useTexture,
} from "./textures";

/** 0 is night with the curtain closed, 1 is day with it open. Negative until first set. */
export const daylight = { value: -1 };

const HALF = 4;
const DEPTH = 5.6;
const HEIGHT = 5.4;

function Screen({ p, w, h, map, r }: { p: V3; w: number; h: number; map: THREE.Texture; r?: V3 }) {
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function Print({ p, w, h, map, r }: { p: V3; w: number; h: number; map: THREE.Texture; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} roughness={0.62} />
    </mesh>
  );
}

/** A soft dark patch that grounds an object where it meets a surface. */
function Contact({ p, w, d, opacity = 0.6, wall }: { p: V3; w: number; d: number; opacity?: number; wall?: boolean }) {
  return (
    <mesh position={p} rotation={wall ? undefined : [-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={blobTexture()} transparent opacity={opacity} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  );
}

function Corner({ p, w, h, r, opacity = 1 }: { p: V3; w: number; h: number; r: V3; opacity?: number }) {
  return (
    <mesh position={p} rotation={r} renderOrder={1}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={edgeTexture()} transparent opacity={opacity} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  );
}

/** Soft shadows baked into the floor under each piece of furniture. */
const FLOOR_SHADES: Array<[number, number, number, number, number]> = [
  [0.22, 0.78, 2.25, 0.86, 0.44],
  ...(FEATURES.gamingPc ? ([[-1.05, 0.68, 0.34, 0.46, 0.5]] as Array<[number, number, number, number, number]>) : []),
  [3.05, 0.42, 1.14, 0.64, 0.52],
  [HOOP.x, HOOP.z, 0.52, 0.46, 0.52],
  [-2.95, 0.3, 0.26, 0.24, 0.42],
  ...(FEATURES.dogs ? ([[0.34, 0.9, 0.42, 0.4, 0.5], [1.2, 0.9, 0.38, 0.36, 0.5]] as Array<[number, number, number, number, number]>) : []),
  [GOAL.x - 0.14, GOAL.z, 0.3, 0.52, 0.3],
];

/** The back wall with a real opening, so the outdoors can be seen through the window. */
function backWallGeometry() {
  const width = HALF * 2 + 0.3;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, HEIGHT);
  shape.lineTo(-width / 2, HEIGHT);
  shape.closePath();
  const hole = new THREE.Path();
  const { x, y, w, h } = WINDOW;
  hole.moveTo(x - w / 2, y - h / 2);
  hole.lineTo(x - w / 2, y + h / 2);
  hole.lineTo(x + w / 2, y + h / 2);
  hole.lineTo(x + w / 2, y - h / 2);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  geometry.translate(0, 0, -0.16);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / HEIGHT);
  return geometry;
}

function Shell() {
  prepareWalls();
  const floor = useMemo(() => makeFloorMaterial(HALF * 2, DEPTH, FLOOR_SHADES), []);
  const slats = useMemo(() => makeSlatMaterial(HALF * 2, 1.2), []);
  const backWall = useMemo(backWallGeometry, []);
  useEffect(() => () => backWall.dispose(), [backWall]);
  return (
    <>
      <mesh position={[0, 0, DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[HALF * 2, DEPTH]} />
      </mesh>
      <mesh geometry={backWall} material={wallMaterial} receiveShadow />
      <mesh position={[-HALF - 0.08, HEIGHT / 2, DEPTH / 2]} material={sideWallMaterial} receiveShadow>
        <boxGeometry args={[0.16, HEIGHT, DEPTH + 0.02]} />
      </mesh>
      <mesh position={[HALF + 0.08, HEIGHT / 2, DEPTH / 2]} material={sideWallMaterial} receiveShadow>
        <boxGeometry args={[0.16, HEIGHT, DEPTH + 0.02]} />
      </mesh>
      {/* Slatted walnut panel along the lower wall */}
      <mesh position={[0, 0.62, 0.025]} material={slats} receiveShadow>
        <boxGeometry args={[HALF * 2, 1.2, 0.05]} />
      </mesh>
      <Merged cast={false}>
        <B p={[0, -0.13, DEPTH / 2]} s={[HALF * 2 + 0.3, 0.2, DEPTH + 0.16]} c="walnutDark" radius={0.02} />
        <B p={[0, 1.235, 0.04]} s={[HALF * 2, 0.04, 0.08]} c="walnut" radius={0.012} />
        <B p={[0, 0.05, 0.06]} s={[HALF * 2, 0.1, 0.03]} c="walnutDark" radius={0.008} />
        <B p={[-HALF + 0.015, 0.06, DEPTH / 2]} s={[0.03, 0.12, DEPTH]} c="trim" radius={0.008} />
        <B p={[HALF - 0.015, 0.06, DEPTH / 2]} s={[0.03, 0.12, DEPTH]} c="trim" radius={0.008} />
        {/* Rug */}
        <B p={[0.15, 0.012, 2.2]} s={[4.4, 0.024, 1.5]} c="rugEdge" radius={0.01} />
        <B p={[0.15, 0.02, 2.2]} s={[4.2, 0.024, 1.3]} c="rug" radius={0.01} />
      </Merged>
      <Corner p={[0, 0.16, 0.052]} w={HALF * 2} h={0.32} r={[0, 0, 0]} opacity={0.7} />
      <Corner p={[0, HEIGHT - 0.3, 0.002]} w={HALF * 2} h={0.6} r={[0, 0, Math.PI]} opacity={0.42} />
      <Corner p={[-HALF + 0.3, HEIGHT / 2, 0.003]} w={HEIGHT} h={0.6} r={[0, 0, -Math.PI / 2]} opacity={0.4} />
      <Corner p={[HALF - 0.3, HEIGHT / 2, 0.003]} w={HEIGHT} h={0.6} r={[0, 0, Math.PI / 2]} opacity={0.4} />
      <Corner p={[-HALF + 0.003, HEIGHT / 2, 0.3]} w={HEIGHT} h={0.6} r={[0, Math.PI / 2, -Math.PI / 2]} opacity={0.55} />
      <Corner p={[HALF - 0.003, HEIGHT / 2, 0.3]} w={HEIGHT} h={0.6} r={[0, -Math.PI / 2, Math.PI / 2]} opacity={0.55} />
    </>
  );
}

const WINDOW = { x: -3, y: 2.32, w: 1.76, h: 1.98 };

function curtainGeometry(width: number, height: number, side: -1 | 1) {
  const geometry = new THREE.PlaneGeometry(width, height, 72, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + width / 2;
    const fold = Math.sin((x / width) * Math.PI * 18);
    const soft = Math.sin((x / width) * Math.PI * 5 + 0.7) * 0.012;
    position.setX(i, side === -1 ? x : x - width);
    position.setZ(i, fold * 0.032 + soft);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function CurtainPanel({ side }: { side: -1 | 1 }) {
  const group = useRef<THREE.Group>(null);
  const width = WINDOW.w / 2 + 0.2;
  const height = WINDOW.h + 0.36;
  const geometry = useMemo(() => curtainGeometry(width, height, side), [width, height, side]);
  const material = useMemo(() => {
    const base = mat("fabric");
    const cloth = base.clone();
    cloth.side = THREE.DoubleSide;
    cloth.color.set("#8ea3d8");
    return cloth;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    if (group.current) group.current.scale.x = THREE.MathUtils.lerp(1, 0.22, Math.max(daylight.value, 0));
  });

  return (
    <group ref={group} position={[WINDOW.x + (side * (WINDOW.w + 0.4)) / 2, WINDOW.y - 0.04, 0.255]}>
      <mesh geometry={geometry} material={material} receiveShadow />
    </group>
  );
}

const CURTAIN_TAP_MS = 450;

function WindowWithCurtain() {
  const { toggleDay, labelOf } = useSceneApi();
  const lastTap = useRef(-Infinity);
  // A double click must not open the curtain and close it again right away.
  const tapCurtain = () => {
    const now = performance.now();
    if (now - lastTap.current < CURTAIN_TAP_MS) return;
    lastTap.current = now;
    toggleDay();
  };
  const sunPatch = useMemo(() => makeSunPatch(), []);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => () => sunPatch.dispose(), [sunPatch]);

  useFrame(() => {
    const t = Math.max(daylight.value, 0);
    if (beam.current) beam.current.opacity = t * 0.34;
  });

  const { x, y, w, h } = WINDOW;
  return (
    <Hotspot label={labelOf("curtain")} onTap={tapCurtain} labelAt={[x, y - h / 2 + 0.28, 0.36]} hit={{ p: [x, y, 0.18], s: [w + 0.4, h + 0.3, 0.36] }}>
      <mesh position={[x, y, 0.03]} renderOrder={1}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#dcebf7" transparent opacity={0.09} roughness={0.05} metalness={0.3} depthWrite={false} />
      </mesh>
      <Merged cast={false}>
        <B p={[x, y + h / 2 + 0.03, 0.05]} s={[w + 0.14, 0.08, 0.1]} c="trim" />
        <B p={[x, y - h / 2 - 0.035, 0.09]} s={[w + 0.3, 0.06, 0.19]} c="trim" />
        <B p={[x - w / 2 - 0.035, y, 0.05]} s={[0.08, h + 0.1, 0.1]} c="trim" />
        <B p={[x + w / 2 + 0.035, y, 0.05]} s={[0.08, h + 0.1, 0.1]} c="trim" />
        <B p={[x, y, 0.04]} s={[0.04, h, 0.05]} c="trim" />
        <B p={[x, y + 0.26, 0.04]} s={[w, 0.04, 0.05]} c="trim" />
        <Cyl p={[x, y + h / 2 + 0.17, 0.255]} r={0.02} h={w + 0.56} c="brass" rot={[0, 0, Math.PI / 2]} seg={14} />
        <Ball p={[x - w / 2 - 0.28, y + h / 2 + 0.17, 0.255]} r={0.04} c="brass" />
        <Ball p={[x + w / 2 + 0.28, y + h / 2 + 0.17, 0.255]} r={0.04} c="brass" />
        <B p={[x - w / 2 - 0.1, y + h / 2 + 0.12, 0.14]} s={[0.03, 0.1, 0.25]} c="brass" radius={0.008} />
        <B p={[x + w / 2 + 0.1, y + h / 2 + 0.12, 0.14]} s={[0.03, 0.1, 0.25]} c="brass" radius={0.008} />
      </Merged>
      <CurtainPanel side={-1} />
      <CurtainPanel side={1} />
      <mesh position={[-2.1, 0.034, 1.75]} rotation={[-Math.PI / 2, 0, -0.42]} renderOrder={2}>
        <planeGeometry args={[2.1, 2.5]} />
        <meshBasicMaterial ref={beam} map={sunPatch} color="#ffe8ba" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </Hotspot>
  );
}

const SCREEN = { x: 0.2, y: 1.39, z: 0.4, w: 1.46, h: 0.86 };
const MINI = { x: -0.345, y: 0.79, z: 0.56, size: 0.3, height: 0.115, foot: 0.008 };

function MonitorApp({ id, x }: { id: string; x: number }) {
  const { select, labelOf } = useSceneApi();
  const { handlers } = useTapHandlers(labelOf(`monitor-${id}`), () => select("monitor", id));
  return (
    <mesh
      position={[SCREEN.x + (x / 800 - 0.5) * SCREEN.w, SCREEN.y + (0.5 - (MONITOR_APP_Y + 18) / 480) * SCREEN.h, SCREEN.z + 0.08]}
      scale={[0.36, 0.46, 0.02]}
      visible={false}
      {...handlers}
    >
      <boxGeometry />
    </mesh>
  );
}

/** The monitor's home screen, with one icon for each tab. */
function MonitorScreen() {
  const texture = useMemo(() => makeTexture(800, 480, drawMonitorHome({ terminal: "Terminal", github: "GitHub" })), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      <Screen p={[SCREEN.x, SCREEN.y, SCREEN.z]} w={SCREEN.w} h={SCREEN.h} map={texture} />
      {MONITOR_APPS.map((app) => (
        <MonitorApp key={app.id} id={app.id} x={app.x} />
      ))}
    </>
  );
}

const GLASS = { x: -1.25, y: 0.79, z: 0.44 };
const ICE: Array<{ p: V3; r: [number, number, number]; s: number }> = [
  { p: [-0.024, 0.178, 0.018], r: [0.5, 0.3, 0.2], s: 0.05 },
  { p: [0.03, 0.184, -0.012], r: [0.2, 0.9, 0.6], s: 0.046 },
  { p: [-0.008, 0.168, -0.034], r: [0.8, 0.2, 0.4], s: 0.042 },
];

/** A tall glass of cola with ice and a striped straw. */
function SodaGlass() {
  const liquid = useMemo(() => [[0, 0.012], [0.062, 0.012], [0.07, 0.022], [0.08, 0.19], [0, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), []);
  const foam = useMemo(() => [[0, 0.19], [0.08, 0.19], [0.081, 0.2], [0.06, 0.205], [0, 0.204]].map(([x, y]) => new THREE.Vector2(x, y)), []);
  const glass = useMemo(() => [[0, 0], [0.068, 0], [0.074, 0.006], [0.09, 0.24], [0.087, 0.242], [0.083, 0.238], [0.068, 0.012], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)), []);
  const straw: V3[] = [[0.018, 0.03, 0.005], [0.04, 0.2, -0.002], [0.056, 0.3, -0.006], [0.1, 0.335, -0.008]];
  return (
    <group position={[GLASS.x, GLASS.y, GLASS.z]}>
      <Contact p={[0, 0.004, 0]} w={0.3} d={0.3} opacity={0.42} />
      <mesh castShadow>
        <latheGeometry args={[liquid, 32]} />
        <meshStandardMaterial color="#2b1209" roughness={0.16} metalness={0.05} />
      </mesh>
      <mesh>
        <latheGeometry args={[foam, 32]} />
        <meshStandardMaterial color="#c79a72" roughness={0.7} />
      </mesh>
      {ICE.map((cube, i) => (
        <mesh key={i} position={cube.p} rotation={cube.r}>
          <boxGeometry args={[cube.s, cube.s, cube.s]} />
          <meshStandardMaterial color="#eaf6fb" roughness={0.1} transparent opacity={0.85} />
        </mesh>
      ))}
      <Merged cast={false}>
        <Tube points={straw} radius={0.0075} c="red" segments={20} />
      </Merged>
      <mesh renderOrder={4}>
        <latheGeometry args={[glass, 36]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.2} roughness={0.04} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const KEY_PITCH = 0.05;
const KEY_GAP = 0.008;
const ones = (count: number) => Array<number>(count).fill(1);
/** Key widths of each row. Every row adds up to 14 units, so the edges line up. */
const KEY_ROWS = [
  [...ones(12), 2],
  [1.5, ...ones(11), 1.5],
  [1.75, ...ones(10), 2.25],
  [2.25, ...ones(9), 2.75],
  [1.25, 1.25, 1.25, 5.75, 1.5, 1.5, 1.5],
];

function Keyboard() {
  const cx = 0.08;
  const cz = 0.97;
  const keys: Array<{ p: V3; s: V3; c: string }> = [];
  KEY_ROWS.forEach((row, rowIndex) => {
    let cursor = -7;
    row.forEach((units) => {
      keys.push({
        p: [cx + (cursor + units / 2) * KEY_PITCH, 0.828, cz - 0.1 + rowIndex * KEY_PITCH],
        s: [units * KEY_PITCH - KEY_GAP, 0.014, 0.042],
        c: units > 1 && units < 5 ? "keycapLight" : "keycap",
      });
      cursor += units;
    });
  });
  return (
    <Merged cast={false}>
      <B p={[cx, 0.812, cz]} s={[0.76, 0.02, 0.28]} c="aluminum" radius={0.008} />
      {keys.map((key, i) => (
        <B key={i} {...key} radius={0.004} seg={1} />
      ))}
    </Merged>
  );
}

const MOUSE = { halfW: 0.06, halfL: 0.122, height: 0.04 };

/** The smooth low dome of a wireless mouse, on a rounded-rectangle footprint. */
function mouseShell() {
  const geometry = new THREE.SphereGeometry(1, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const position = geometry.attributes.position;
  const power = 3.1;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const edge = 1 / Math.pow(Math.abs(Math.cos(angle)) ** power + Math.abs(Math.sin(angle)) ** power, 1 / power);
    const along = z * edge;
    const crest = 1 - 0.16 * (along + 0.25) ** 2;
    position.setXYZ(i, x * edge * MOUSE.halfW, position.getY(i) * MOUSE.height * crest, along * MOUSE.halfL);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A white multi-touch mouse on a slim aluminum base. */
function MagicMouse() {
  return (
    <group position={[0.74, 0.798, 0.96]} rotation={[0, -0.16, 0]}>
      <Contact p={[0, 0.002, 0]} w={0.22} d={0.36} opacity={0.46} />
      <Merged>
        <B p={[0, 0.005, 0]} s={[MOUSE.halfW * 1.86, 0.007, MOUSE.halfL * 1.9]} c="aluminum" radius={0.003} seg={2} />
        <Shaped id="magic-mouse" make={mouseShell} p={[0, 0.0075, 0]} c="caseWhite" />
      </Merged>
    </group>
  );
}

const LAMP = {
  foot: [1.98, 0.79, 0.34] as V3,
  shoulder: [1.98, 0.875, 0.34] as V3,
  elbow: [2.07, 1.3, 0.43] as V3,
  wrist: [1.82, 1.525, 0.7] as V3,
  head: [1.72, 1.34, 0.7] as V3,
};

/** Two parallel rods make each arm of the lamp, like a real architect's lamp. */
function LampArm({ from, to }: { from: V3; to: V3 }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <Tube key={side} points={[[from[0], from[1], from[2] + side * 0.017], [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2 + side * 0.017], [to[0], to[1], to[2] + side * 0.017]]} radius={0.0065} c="blackMetal" segments={8} />
      ))}
    </>
  );
}

function DeskLamp() {
  const { foot, shoulder, elbow, wrist, head } = LAMP;
  const joint = (p: V3, r: number) => (
    <group key={p.join()}>
      <Cyl p={p} r={r} h={0.052} c="brass" seg={20} rot={[Math.PI / 2, 0, 0]} />
      <Cyl p={p} r={r * 0.42} h={0.06} c="blackMetal" seg={12} rot={[Math.PI / 2, 0, 0]} />
    </group>
  );
  return (
    <>
      <Contact p={[foot[0], foot[1] + 0.003, foot[2]]} w={0.46} d={0.46} opacity={0.46} />
      <Merged>
        <Turned p={foot} profile={[[0, 0], [0.128, 0], [0.133, 0.006], [0.13, 0.018], [0.112, 0.028], [0.04, 0.038], [0.03, 0.05], [0, 0.05]]} c="blackMetal" seg={40} />
        <Cyl p={[foot[0], foot[1] + 0.056, foot[2]]} r={0.032} h={0.014} c="brass" seg={24} />
        <Cyl p={[foot[0], foot[1] + 0.076, foot[2]]} r={0.016} h={0.04} c="blackMetal" seg={14} />
        <LampArm from={shoulder} to={elbow} />
        <LampArm from={elbow} to={wrist} />
        {joint(shoulder, 0.026)}
        {joint(elbow, 0.03)}
        {joint(wrist, 0.024)}
        <group position={head} rotation={[0.2, 0, -0.32]}>
          <Turned p={[0, 0, 0]} profile={[[0.165, 0], [0.168, 0.004], [0.158, 0.03], [0.112, 0.092], [0.074, 0.132], [0.052, 0.158], [0.046, 0.19], [0.036, 0.206], [0, 0.21]]} c="blackMetal" seg={40} />
          <Turned p={[0, 0, 0]} profile={[[0.05, 0.16], [0.07, 0.126], [0.108, 0.086], [0.152, 0.026], [0.162, 0.002], [0.168, 0]]} c="brass" seg={40} />
          <Ring p={[0, 0.001, 0]} r={0.166} tube={0.004} c="brass" rot={[Math.PI / 2, 0, 0]} />
          <Cyl p={[0, 0.218, 0]} r={0.017} h={0.03} c="brass" seg={14} />
        </group>
        <Tube points={[[head[0] + 0.073, head[1] + 0.21, head[2] + 0.04], [(head[0] + wrist[0]) / 2 + 0.03, wrist[1] + 0.012, (head[2] + wrist[2]) / 2], wrist]} radius={0.008} c="blackMetal" segments={8} />
      </Merged>
      <mesh position={[1.735, 1.385, 0.695]}>
        <sphereGeometry args={[0.052, 18, 14]} />
        <meshBasicMaterial color="#fff0c9" toneMapped={false} />
      </mesh>
    </>
  );
}

function Desk() {
  return (
    <>
      <Merged>
        {/* Top and steel frame */}
        <B p={[0.22, 0.76, 0.72]} s={[3.72, 0.055, 1.08]} c="oak" radius={0.018} />
        <B p={[0.22, 0.705, 0.3]} s={[3.3, 0.05, 0.035]} c="blackMetal" radius={0.008} />
        {[-1.52, 1.96].map((x) => (
          <group key={x}>
            <B p={[x, 0.37, 0.34]} s={[0.05, 0.7, 0.05]} c="blackMetal" radius={0.01} />
            <B p={[x, 0.37, 1.1]} s={[0.05, 0.7, 0.05]} c="blackMetal" radius={0.01} />
            <B p={[x, 0.03, 0.72]} s={[0.055, 0.04, 0.92]} c="blackMetal" radius={0.01} />
            <B p={[x, 0.705, 0.72]} s={[0.05, 0.05, 0.86]} c="blackMetal" radius={0.01} />
          </group>
        ))}
        {/* Desk mat */}
        <B p={[0.25, 0.794, 0.96]} s={[1.56, 0.008, 0.44]} c="felt" radius={0.003} seg={1} />
        {/* Monitor */}
        <B p={[0.2, 1.39, 0.37]} s={[1.52, 0.92, 0.05]} c="plasticDark" radius={0.016} />
        <B p={[0.2, 1.1, 0.33]} s={[0.1, 0.56, 0.035]} c="aluminum" radius={0.012} />
        <Turned
          p={[0.2, 0.795, 0.36]}
          profile={[[0, 0], [0.235, 0], [0.245, 0.006], [0.235, 0.013], [0.05, 0.02], [0, 0.02]]}
          c="aluminum"
          scale={[1.15, 1, 0.8]}
        />
        {/* Mouse */}
      </Merged>
      <DeskLamp />
      <Keyboard />
      <MagicMouse />
      <SodaGlass />
    </>
  );
}

const SPIN_KICK = 3.4;
const MAX_SPIN = 30;

/** Each click pushes the seat, so clicking again and again makes it spin faster. */
function OfficeChair() {
  const { labelOf } = useSceneApi();
  const invalidate = useThree((state) => state.invalidate);
  const seat = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const legs = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2 + 0.3);
  const { handlers } = useTapHandlers(labelOf("chair"), () => {
    spin.current = Math.min(spin.current + SPIN_KICK, MAX_SPIN);
    wakeDogs(invalidate);
    invalidate();
  });

  useFrame(({ gl }, rawDelta) => {
    if (!seat.current || spin.current === 0) return;
    const delta = Math.min(rawDelta, 0.05);
    chairPose.yaw += spin.current * delta;
    seat.current.rotation.y = chairPose.yaw;
    spin.current *= Math.exp(-0.75 * delta);
    if (spin.current < 0.03) spin.current = 0;
    chairPose.moving = spin.current !== 0;
    if (spin.current > 0.5) wakeDogs(invalidate);
    gl.shadowMap.needsUpdate = true;
    invalidate();
  });

  return (
    <group position={[chairPose.x, 0, chairPose.z]}>
      <Contact p={[0, 0.006, 0]} w={1.35} d={1.35} opacity={0.62} />
      <Merged>
        {legs.map((a) => (
          <group key={a}>
            <B p={[Math.cos(a) * 0.18, 0.1, Math.sin(a) * 0.18]} s={[0.36, 0.035, 0.055]} r={[0, -a, 0]} c="blackMetal" radius={0.014} />
            <Ball p={[Math.cos(a) * 0.36, 0.045, Math.sin(a) * 0.36]} r={0.045} c="plasticDark" />
          </group>
        ))}
        <Cyl p={[0, 0.17, 0]} r={0.05} h={0.14} c="blackMetal" seg={16} />
        <Cyl p={[0, 0.33, 0]} r={0.028} h={0.24} c="chrome" seg={16} />
      </Merged>
      <group ref={seat} rotation={[0, chairPose.yaw, 0]}>
        <Merged>
          <B p={[0, 0.45, 0]} s={[0.46, 0.03, 0.42]} c="blackMetal" radius={0.012} />
          <B p={[0, 0.52, 0.02]} s={[0.62, 0.1, 0.6]} c="fabric" radius={0.045} seg={4} />
          <B p={[0, 0.48, -0.25]} s={[0.1, 0.05, 0.2]} c="blackMetal" radius={0.014} />
          <B p={[0, 0.72, -0.335]} s={[0.07, 0.46, 0.035]} r={[0.08, 0, 0]} c="blackMetal" radius={0.012} />
          <B p={[0, 1.08, -0.35]} s={[0.56, 0.72, 0.075]} r={[-0.1, 0, 0]} c="fabric" radius={0.036} seg={4} />
          <B p={[0, 1.08, -0.39]} s={[0.5, 0.66, 0.03]} r={[-0.1, 0, 0]} c="blackMetal" radius={0.012} />
          {[-1, 1].map((side) => (
            <group key={side}>
              <B p={[side * 0.34, 0.6, -0.02]} s={[0.035, 0.22, 0.05]} c="blackMetal" radius={0.01} />
              <B p={[side * 0.34, 0.72, 0]} s={[0.08, 0.035, 0.3]} c="plasticDark" radius={0.016} />
            </group>
          ))}
        </Merged>
        {/* The click area follows the backrest, so it never covers the curtain behind it. */}
        <mesh position={[0, 1.07, -0.35]} rotation={[-0.1, 0, 0]} scale={[0.6, 0.76, 0.14]} visible={false} {...handlers}>
          <boxGeometry />
        </mesh>
      </group>
      <mesh position={[0, 0.39, 0]} scale={[0.82, 0.78, 0.82]} visible={false} {...handlers}>
        <boxGeometry />
      </mesh>
    </group>
  );
}

function Plant() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = i * 2.399;
        const rise = i / 25;
        const reach = 0.04 + (1 - rise) * 0.08;
        return {
          p: [Math.cos(angle) * reach, 0.62 + rise * 1.12, Math.sin(angle) * reach] as V3,
          r: [1.15 - rise * 0.45, -angle + Math.PI / 2, 0, "YXZ"] as [number, number, number, THREE.EulerOrder],
          size: 0.46 - rise * 0.12,
          c: i % 3 === 0 ? "leafLight" : "leaf",
        };
      }),
    [],
  );
  return (
    <>
      <group position={[3.6, 2.06, 0.32]} scale={0.27}>
        <Merged>
          <Turned
            p={[0, 0, 0]}
            profile={[[0, 0], [0.19, 0], [0.21, 0.015], [0.27, 0.42], [0.275, 0.46], [0.255, 0.465], [0.235, 0.43], [0, 0.42]]}
            c="ceramic"
            seg={36}
          />
          <Cyl p={[0, 0.425, 0]} r={0.24} h={0.012} c="soil" seg={24} />
          <Tube points={[[0, 0.42, 0], [0.025, 0.85, 0.01], [-0.02, 1.3, -0.01], [0.015, 1.72, 0.01]]} radius={0.018} c="bark" segments={16} />
          {leaves.map((leaf, i) => (
            <Leaf key={i} {...leaf} />
          ))}
        </Merged>
      </group>
    </>
  );
}

/** Keeps the artwork's original colors, dimming them only when the room goes dark. */
function VividPrint({ p, w, h, map }: { p: V3; w: number; h: number; map: THREE.Texture }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (material.current) material.current.color.setScalar(THREE.MathUtils.lerp(0.62, 1, Math.max(daylight.value, 0)));
  });
  return (
    <mesh position={p}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={material} map={map} toneMapped={false} />
    </mesh>
  );
}

function Framed({ p, w, h, map, matWidth = 0.07, vivid }: { p: V3; w: number; h: number; map: THREE.Texture; matWidth?: number; vivid?: boolean }) {
  return (
    <>
      <Contact p={[p[0] + 0.02, p[1] - 0.05, 0.004]} w={w + 0.42} d={h + 0.42} opacity={0.34} wall />
      <Merged>
        <B p={[p[0], p[1], 0.022]} s={[w + matWidth * 2 + 0.07, h + matWidth * 2 + 0.07, 0.044]} c="blackMetal" radius={0.008} />
        <B p={[p[0], p[1], 0.036]} s={[w + matWidth * 2, h + matWidth * 2, 0.024]} c="paper" radius={0.002} seg={1} />
      </Merged>
      {vivid ? <VividPrint p={[p[0], p[1], 0.05]} w={w} h={h} map={map} /> : <Print p={[p[0], p[1], 0.05]} w={w} h={h} map={map} />}
    </>
  );
}

const RACKET = { y: 0.24, a: 0.185, b: 0.245, wall: 0.021, shoulder: 0.62, neck: 0.022, neckY: -0.225, shaftY: -0.3, apexY: -0.19 };
const RACKET_BOUNDS = { minX: -0.21, maxX: 0.21, minY: -0.31, maxY: 0.5 };

/** A racket head is a slightly egg-shaped oval, wider toward the tip. */
const racketPoint = (t: number, inset = 0): [number, number] => [
  (RACKET.a - inset) * Math.cos(t) * (1 + 0.06 * Math.sin(t)),
  RACKET.y + (RACKET.b - inset) * Math.sin(t),
];

const racketOutline = (inset: number, count = 120) =>
  Array.from({ length: count }, (_, i) => new THREE.Vector2(...racketPoint((i / count) * Math.PI * 2, inset)));

/** Head, open throat and shaft cut from one piece, like a real graphite frame. */
function racketBody() {
  const { shoulder, neck, neckY, shaftY, apexY, wall } = RACKET;
  const shape = new THREE.Shape();
  const steps = 130;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = racketPoint(-shoulder + ((Math.PI + 2 * shoulder) * i) / steps);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const [sx, sy] = racketPoint(-shoulder);
  shape.bezierCurveTo(-0.122, 0.02, -0.05, -0.125, -neck, neckY);
  shape.lineTo(-neck * 0.92, shaftY);
  shape.lineTo(neck * 0.92, shaftY);
  shape.lineTo(neck, neckY);
  shape.bezierCurveTo(0.05, -0.125, 0.122, 0.02, sx, sy);
  shape.holes.push(new THREE.Path(racketOutline(wall)));

  const throat = new THREE.Path();
  const arc = 0.6;
  for (let i = 0; i <= 28; i++) {
    const [x, y] = racketPoint(-Math.PI / 2 - arc + (2 * arc * i) / 28, -0.002);
    if (i === 0) throat.moveTo(x, y);
    else throat.lineTo(x, y);
  }
  const [startX, startY] = racketPoint(-Math.PI / 2 - arc, -0.002);
  throat.quadraticCurveTo(0.05, -0.085, 0, apexY);
  throat.quadraticCurveTo(-0.05, -0.085, startX, startY);
  shape.holes.push(throat);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.017, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0025, bevelSegments: 2, curveSegments: 18 });
  geometry.translate(0, 0, -0.0085);
  const { minX, maxX, minY, maxY } = RACKET_BOUNDS;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) - minX) / (maxX - minX), (position.getY(i) - minY) / (maxY - minY));
  return geometry;
}

/** Olive-black paint with khaki camo on one side and white blocks on the other. */
const drawRacketPaint = (c: CanvasRenderingContext2D, w: number, h: number) => {
  const { minX, maxX, minY, maxY } = RACKET_BOUNDS;
  const X = (x: number) => ((x - minX) / (maxX - minX)) * w;
  const Y = (y: number) => ((maxY - y) / (maxY - minY)) * h;
  const block = (x0: number, y0: number, x1: number, y1: number, color: string, slant = 0) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(X(x0), Y(y0 + slant));
    c.lineTo(X(x1), Y(y0 - slant));
    c.lineTo(X(x1), Y(y1 - slant));
    c.lineTo(X(x0), Y(y1 + slant));
    c.closePath();
    c.fill();
  };
  c.fillStyle = "#25261e";
  c.fillRect(0, 0, w, h);

  let seed = 41;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const camo = (x0: number, y0: number, x1: number, y1: number, count: number) => {
    block(x0, y0, x1, y1, "#a4976a");
    const tones = ["#6d6645", "#c9bc8e", "#3b3b2a", "#8a7f57"];
    for (let i = 0; i < count; i++) {
      const x = x0 + random() * (x1 - x0);
      const y = y0 + random() * (y1 - y0);
      c.fillStyle = tones[i % tones.length];
      c.beginPath();
      c.ellipse(X(x), Y(y), 7 + random() * 15, 5 + random() * 11, random() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
  };
  // Khaki camo down the left side of the head, its arm and the shaft.
  c.save();
  c.beginPath();
  c.rect(X(minX), Y(0.2), X(-0.075) - X(minX), Y(-0.21) - Y(0.2));
  c.clip();
  camo(minX, -0.21, -0.075, 0.2, 90);
  c.restore();
  block(minX, 0.205, -0.075, 0.2, "#25261e");
  block(-0.12, 0.42, -0.04, 0.445, "#a4976a", 0.012);
  camo(-0.03, -0.3, 0.03, -0.2, 16);
  block(-0.03, -0.215, 0.03, -0.205, "#25261e");

  // White blocks on the right shoulder and arm.
  block(0.105, 0.135, maxX, 0.385, "#f4f2ea", 0.016);
  block(0.105, 0.2, maxX, 0.212, "#25261e", 0.016);
  [0.03, -0.035, -0.095, -0.15].forEach((y, i) => block(0.012, y, 0.15, y + 0.04 - i * 0.004, "#f4f2ea", 0.022));
};

/** Where a straight string meets the inside of the frame. */
function stringSpan(axis: "x" | "y", value: number) {
  const outline = racketOutline(RACKET.wall);
  const other = axis === "x" ? "y" : "x";
  const hits: number[] = [];
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length];
    if ((a[axis] - value) * (b[axis] - value) > 0 || a[axis] === b[axis]) return;
    hits.push(a[other] + ((value - a[axis]) / (b[axis] - a[axis])) * (b[other] - a[other]));
  });
  return { from: Math.min(...hits), to: Math.max(...hits) };
}

const RACKET_MAINS = Array.from({ length: 16 }, (_, i) => (i - 7.5) * 0.0185).map((x) => ({ x, ...stringSpan("x", x) }));
const RACKET_CROSSES = Array.from({ length: 19 }, (_, i) => RACKET.y + (i - 9) * 0.0215).map((y) => ({ y, ...stringSpan("y", y) }));
const RACKET_WRAP: V3[] = Array.from({ length: 65 }, (_, i) => {
  const angle = (i * Math.PI) / 4;
  return [Math.cos(angle) * 0.0282, -0.316 - (i / 64) * 0.268, Math.sin(angle) * 0.0282];
});

/** A graphite tennis racket leaning on the wall, with its butt on the floor. */
function Racket() {
  const paint = useTexture(512, 1088, drawRacketPaint);
  const body = useMemo(racketBody, []);
  useEffect(() => () => body.dispose(), [body]);
  return (
    <>
    <Contact p={[-2.96, 0.58, 0.056]} w={0.72} d={1.28} opacity={0.26} wall />
    <group position={[-2.98, 0.618, 0.185]} rotation={[-0.24, 0, 0.07]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial map={paint} roughness={0.36} metalness={0.12} />
      </mesh>
      <Merged>
        {RACKET_MAINS.map(({ x, from, to }) => (
          <B key={`m${x}`} p={[x, (from + to) / 2, 0.0009]} s={[0.0024, to - from, 0.0018]} c="white" radius={0.0006} seg={1} />
        ))}
        {RACKET_CROSSES.map(({ y, from, to }) => (
          <B key={`c${y}`} p={[(from + to) / 2, y, -0.0009]} s={[to - from, 0.0024, 0.0018]} c="white" radius={0.0006} seg={1} />
        ))}
        <Cyl p={[0, -0.305, 0]} r={0.029} r2={0.027} h={0.016} c="rubber" seg={16} />
        <Cyl p={[0, -0.452, 0]} r={0.0275} h={0.292} c="rubber" seg={8} rot={[0, Math.PI / 8, 0]} />
        <Tube points={RACKET_WRAP} radius={0.0012} c="graphite" segments={130} />
        <Cyl p={[0, -0.603, 0]} r={0.0295} h={0.014} c="white" seg={20} />
        <Turned p={[0, -0.63, 0]} profile={[[0, 0], [0.024, 0], [0.03, 0.007], [0.03, 0.02], [0, 0.02]]} c="rubber" seg={20} />
      </Merged>
    </group>
    </>
  );
}

/** Vitor's portrait, loaded on its own so the room never waits for it. */
function usePortrait() {
  const invalidate = useThree((state) => state.invalidate);
  const texture = useMemo(() => {
    const loaded = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/vitor-avatar.jpg`, () => invalidate());
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = 8;
    return loaded;
  }, [invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A small yellow dot that hides a secret. */
/** A sticky note on the wall behind the plant, with its lower edge curling away. */
function HiddenNote() {
  const { focus, secret } = useSceneApi();
  const map = useTexture(360, 360, drawHiddenNote);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => {
    const sheet = new THREE.PlaneGeometry(0.2, 0.2, 8, 8);
    const points = sheet.attributes.position;
    for (let i = 0; i < points.count; i += 1) {
      const lift = Math.max(0, 0.04 - points.getY(i)) / 0.14;
      points.setZ(i, lift * lift * 0.028);
    }
    sheet.computeVertexNormals();
    return sheet;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (material.current) material.current.color.setScalar(THREE.MathUtils.lerp(0.62, 1, Math.max(daylight.value, 0)));
  });
  return (
    <group position={[3.72, 2.28, 0.008]} rotation={[0, 0, -0.09]} scale={0.75}>
      <mesh position={[0.006, -0.012, -0.002]}>
        <planeGeometry args={[0.205, 0.205]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh
        geometry={geometry}
        onClick={(event) => {
          event.stopPropagation();
          if (!focus && event.delta <= 8 && !ballIsBusy()) secret("claude", event.clientX, event.clientY);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (!focus && event.pointerType === "mouse") document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (!ballInput.grabbing) document.body.style.cursor = "";
        }}
      >
        <meshBasicMaterial ref={material} map={map} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SecretDot({ id, p }: { id: SecretId; p: V3 }) {
  const { focus, secret } = useSceneApi();
  if (focus) return null;
  return (
    <group position={p}>
      <mesh renderOrder={4}>
        <planeGeometry args={[0.13, 0.13]} />
        <meshBasicMaterial map={glowTexture()} color="#ffd33d" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <sphereGeometry args={[0.032, 18, 14]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.012]} renderOrder={5}>
        <sphereGeometry args={[0.024, 16, 12]} />
        <meshBasicMaterial color="#ffd33d" depthTest={false} toneMapped={false} />
      </mesh>
      <mesh
        visible={false}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 8 && !ballIsBusy()) secret(id, event.clientX, event.clientY);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (event.pointerType === "mouse") document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (!ballInput.grabbing) document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.11, 10, 8]} />
      </mesh>
    </group>
  );
}

const BANNER_ART = drawStackBanner(["Java", "Python", "SQL", "Spring Boot", "PostgreSQL", "AWS", "Docker"]);

/** A hanging cloth with a very soft ripple. */
function bannerGeometry() {
  const geometry = new THREE.PlaneGeometry(0.68, 1.04, 16, 24);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const drop = 0.52 - position.getY(i);
    position.setZ(i, Math.sin(x * 11 + drop * 2) * 0.006 * Math.min(drop * 2.4, 1));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function Wall() {
  const { select, labelOf, reduced } = useSceneApi();
  const cork = useTexture(1536, 784, drawCork);
  const banner = useTexture(560, 860, BANNER_ART);
  const bannerCloth = useMemo(bannerGeometry, []);
  useEffect(() => () => bannerCloth.dispose(), [bannerCloth]);
  const diploma = useTexture(620, 340, drawDiploma);
  const certificate = useTexture(620, 380, drawCertificate);
  const paper = useTexture(400, 520, drawPaper);
  const ticker = useMemo(() => {
    const texture = makeTexture(1536, 64, drawTicker);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = TICKER_REPEAT;
    return texture;
  }, []);
  useEffect(() => () => ticker.dispose(), [ticker]);
  useFrame(() => {
    if (!reduced) ticker.offset.x = tickerPhase();
  });

  return (
    <>
      {/* Decorative market ticker */}
      <Contact p={[TICKER.x, TICKER.y - 0.04, 0.004]} w={TICKER.w + 0.75} d={TICKER.h + 0.52} opacity={0.3} wall />
      <Merged>
        <B p={[TICKER.x, TICKER.y, 0.035]} s={[TICKER.w + 0.1, TICKER.h + 0.08, 0.07]} c="plasticDark" radius={0.016} />
      </Merged>
      <Screen p={[TICKER.x, TICKER.y, TICKER.z]} w={TICKER.w} h={TICKER.h} map={ticker} />
      <SecretDot id="market" p={[TICKER.x + TICKER.w / 2 + 0.16, TICKER.y, 0.09]} />

      <Hotspot label={labelOf("stack")} onTap={() => select("stack")} labelAt={[-1.34, 2.2, 0.18]} hit={{ p: [-1.34, 2.76, 0.05], s: [0.72, 1.06, 0.1] }}>
        <Contact p={[-1.31, 2.72, 0.004]} w={1.05} d={1.42} opacity={0.3} wall />
        <mesh geometry={bannerCloth} position={[-1.34, 2.76, 0.035]} receiveShadow>
          <meshStandardMaterial map={banner} alphaTest={0.5} roughness={0.92} side={THREE.DoubleSide} />
        </mesh>
        <Merged>
          <Cyl p={[-1.34, 3.26, 0.05]} r={0.012} h={0.74} c="brass" seg={14} rot={[0, 0, Math.PI / 2]} />
          {[-1, 1].map((side) => (
            <Ball key={side} p={[-1.34 + side * 0.375, 3.26, 0.05]} r={0.021} c="brass" />
          ))}
          <Tube points={[[-1.62, 3.26, 0.05], [-1.34, 3.38, 0.025], [-1.06, 3.26, 0.05]]} radius={0.0035} c="blackMetal" segments={16} />
          <Ball p={[-1.34, 3.38, 0.02]} r={0.012} c="brass" />
        </Merged>
      </Hotspot>

      <Hotspot label={labelOf("cork")} onTap={() => select("cork")} labelAt={[0.22, 2.2, 0.16]} hit={{ p: [0.22, 2.78, 0.05], s: [2.06, 1.1, 0.1] }}>
        <Contact p={[0.24, 2.72, 0.004]} w={2.6} d={1.6} opacity={0.34} wall />
        <Merged>
          <B p={[0.22, 2.78, 0.025]} s={[2.04, 1.08, 0.05]} c="walnut" radius={0.012} />
        </Merged>
        <VividPrint p={[0.22, 2.78, 0.052]} w={1.94} h={0.99} map={cork} />
      </Hotspot>

      <Hotspot label={labelOf("diploma")} onTap={() => select("diploma")} labelAt={[1.76, 2.34, 0.16]} hit={{ p: [1.76, 2.85, 0.05], s: [0.96, 0.76, 0.1] }}>
        <Framed p={[1.76, 2.85, 0]} w={0.74} h={0.41} map={diploma} />
      </Hotspot>

      <Hotspot label={labelOf("certification")} onTap={() => select("certification")} labelAt={[2.78, 2.34, 0.16]} hit={{ p: [2.78, 2.85, 0.05], s: [0.96, 0.76, 0.1] }}>
        <Framed p={[2.78, 2.85, 0]} w={0.74} h={0.45} map={certificate} matWidth={0.06} vivid />
      </Hotspot>

      {/* The paper stays small on the wall but has its own section */}
      <Hotspot label={labelOf("paper")} onTap={() => select("paper")} labelAt={[3.62, 2.54, 0.16]} hit={{ p: [3.62, 2.86, 0.05], s: [0.42, 0.5, 0.1] }}>
        <Framed p={[3.62, 2.86, 0]} w={0.26} h={0.34} map={paper} matWidth={0.03} />
      </Hotspot>
    </>
  );
}

function roundedRect(w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - r);
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + h);
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** A flat rounded screen whose texture fills it edge to edge. */
function roundedScreen(w: number, h: number, r: number) {
  const geometry = new THREE.ShapeGeometry(roundedRect(w, h, r), 10);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / w + 0.5, position.getY(i) / h + 0.5);
  return geometry;
}

function PhoneOnStand() {
  const invalidate = useThree((state) => state.invalidate);
  const [screen] = useState(() => makeTexture(360, 790, drawPhone()));
  const geometry = useMemo(() => roundedScreen(0.153, 0.336, 0.021), []);
  useEffect(() => {
    let active = true;
    const photo = new Image();
    photo.onload = () => {
      if (!active) return;
      redraw(screen, drawPhone(photo));
      invalidate();
    };
    photo.src = `${import.meta.env.BASE_URL}assets/vitor-avatar.jpg`;
    return () => {
      active = false;
    };
  }, [screen, invalidate]);
  useEffect(
    () => () => {
      screen.dispose();
      geometry.dispose();
    },
    [screen, geometry],
  );

  return (
    <group position={[-0.74, 0.788, 0.5]} rotation={[0, 0.14, 0]}>
      <Merged>
        <Turned p={[0, 0, 0]} profile={[[0, 0], [0.086, 0], [0.09, 0.005], [0.083, 0.014], [0.03, 0.019], [0, 0.019]]} c="aluminum" seg={40} />
        <Tube points={[[0, 0.016, -0.018], [0, 0.09, -0.04], [0, 0.18, -0.052]]} radius={0.009} c="aluminum" segments={14} />
        <Cyl p={[0, 0.195, -0.043]} r={0.05} h={0.012} c="aluminum" seg={32} rot={[Math.PI / 2 - 0.2, 0, 0]} />
        <B p={[0, 0.027, 0.039]} s={[0.1, 0.018, 0.016]} c="rubber" radius={0.006} />
      </Merged>
      <group position={[0, 0.2, -0.026]} rotation={[-0.2, 0, 0]}>
        <Merged>
          <Extruded id="phone-body" p={[0, 0, 0]} shape={() => roundedRect(0.166, 0.35, 0.027)} depth={0.011} c="titanium" bevel={0.002} />
          <Extruded id="phone-glass" p={[0, 0, 0.0072]} shape={() => roundedRect(0.162, 0.346, 0.025)} depth={0.0006} c="glassBlack" bevel={0.0005} />
          <B p={[0.0855, 0.06, 0]} s={[0.003, 0.05, 0.006]} c="titanium" radius={0.001} seg={1} />
          <B p={[-0.0855, 0.09, 0]} s={[0.003, 0.028, 0.006]} c="titanium" radius={0.001} seg={1} />
          <B p={[-0.0855, 0.05, 0]} s={[0.003, 0.028, 0.006]} c="titanium" radius={0.001} seg={1} />
        </Merged>
        <mesh geometry={geometry} position={[0, 0, 0.0088]}>
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.151, 0.0092]}>
          <planeGeometry args={[0.046, 0.012]} />
          <meshBasicMaterial color="#030407" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

const LAPTOP_PITCH = 0.58 / 15;
const LAPTOP_GAP = 0.0052;
const LAPTOP_DECK = { x: 0, z: 0.092, w: 0.58, d: 0.22 };
const letters = (text: string) => text.split("").map((label) => ({ label, u: 1 }));

/** Rows of a laptop keyboard. Every row adds up to 15 key widths. */
const LAPTOP_ROWS: Array<{ depth: number; keys: Array<{ label: string; u: number; half?: "up" | "down" }> }> = [
  { depth: 0.62, keys: [{ label: "esc", u: 1.5 }, ...Array.from({ length: 12 }, (_, i) => ({ label: `F${i + 1}`, u: 1 })), { label: "", u: 1.5 }] },
  { depth: 1, keys: [...letters("`1234567890-="), { label: "delete", u: 2 }] },
  { depth: 1, keys: [{ label: "tab", u: 1.5 }, ...letters("QWERTYUIOP[]"), { label: "\\", u: 1.5 }] },
  { depth: 1, keys: [{ label: "caps", u: 1.75 }, ...letters("ASDFGHJKL;'"), { label: "return", u: 2.25 }] },
  { depth: 1, keys: [{ label: "shift", u: 2.25 }, ...letters("ZXCVBNM,./"), { label: "shift", u: 2.75 }] },
  {
    depth: 1,
    keys: [
      { label: "fn", u: 1 }, { label: "ctrl", u: 1 }, { label: "opt", u: 1 }, { label: "cmd", u: 1.25 }, { label: "", u: 5.5 }, { label: "cmd", u: 1.25 }, { label: "opt", u: 1 },
      { label: "←", u: 1 }, { label: "↑", u: 1, half: "up" }, { label: "→", u: 1 },
    ],
  },
];

const LAPTOP_KEYS = (() => {
  const keys: Array<{ x: number; z: number; w: number; d: number; label: string }> = [];
  const total = LAPTOP_ROWS.reduce((sum, row) => sum + row.depth, 0) * LAPTOP_PITCH;
  let top = LAPTOP_DECK.z - total / 2;
  LAPTOP_ROWS.forEach((row) => {
    const depth = row.depth * LAPTOP_PITCH;
    let cursor = -7.5;
    row.keys.forEach((key) => {
      const x = (cursor + key.u / 2) * LAPTOP_PITCH;
      const w = key.u * LAPTOP_PITCH - LAPTOP_GAP;
      if (key.half) {
        const half = (depth - LAPTOP_GAP * 1.5) / 2;
        keys.push({ x, z: top + half / 2 + LAPTOP_GAP / 2, w, d: half, label: "↑" });
        keys.push({ x, z: top + depth - half / 2 - LAPTOP_GAP / 2, w, d: half, label: "↓" });
      } else {
        keys.push({ x, z: top + depth / 2, w, d: depth - LAPTOP_GAP, label: key.label });
      }
      cursor += key.u;
    });
    top += depth;
  });
  return keys;
})();

/** The small white letters printed on the keys. */
const drawKeyLegends = (c: CanvasRenderingContext2D, w: number, h: number) => {
  c.fillStyle = "#e9ebf0";
  c.textAlign = "center";
  c.textBaseline = "middle";
  LAPTOP_KEYS.forEach((key) => {
    if (!key.label) return;
    const px = ((key.x - LAPTOP_DECK.x) / LAPTOP_DECK.w + 0.5) * w;
    const py = ((key.z - LAPTOP_DECK.z) / LAPTOP_DECK.d + 0.5) * h;
    const size = key.label.length === 1 ? (key.d < 0.03 ? 17 : 26) : key.label.startsWith("F") ? 15 : 17;
    c.font = `500 ${size}px "JetBrains Mono Variable", ui-monospace, monospace`;
    c.fillText(key.label, px, py + 1);
  });
};

/** The dotted speaker holes on each side of the keyboard. */
const drawSpeakerGrille = (c: CanvasRenderingContext2D, w: number, h: number) => {
  c.fillStyle = "rgba(24, 26, 32, .82)";
  for (let y = 6; y < h; y += 9) {
    for (let x = 10 + (Math.round(y / 9) % 2) * 4.5; x < w - 6; x += 9) {
      c.beginPath();
      c.arc(x, y, 2, 0, Math.PI * 2);
      c.fill();
    }
  }
};

const LID_OPEN = -0.2;
const LID_CLOSED = Math.PI / 2 - 0.012;

/** Closed on the desk. Opening About lifts the lid and shows Vitor's picture. */
function MacBook() {
  const { focus, reduced } = useSceneApi();
  const invalidate = useThree((state) => state.invalidate);
  const portrait = usePortrait();
  const legends = useTexture(1200, 456, drawKeyLegends);
  const speaker = useTexture(80, 456, drawSpeakerGrille);
  const apple = useMemo(appleGeometry, []);
  useEffect(() => () => apple.dispose(), [apple]);
  const lid = useRef<THREE.Group>(null);
  const open = focus === "about";
  useEffect(() => invalidate(), [open, invalidate]);

  useFrame(({ gl }, delta) => {
    const group = lid.current;
    if (!group) return;
    const goal = open ? LID_OPEN : LID_CLOSED;
    if (group.rotation.x === goal) return;
    const next = reduced ? goal : THREE.MathUtils.damp(group.rotation.x, goal, 5, Math.min(delta, 0.05));
    group.rotation.x = Math.abs(next - goal) < 0.002 ? goal : next;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  });

  return (
    <group position={[1.45, 0.79, 0.7]}>
      <Contact p={[0, 0.003, 0.2]} w={1} d={0.72} opacity={0.4} />
      <Merged>
        <B p={[0, 0.012, 0.2]} s={[0.76, 0.02, 0.5]} c="aluminum" radius={0.008} />
        {LAPTOP_KEYS.map((key, i) => (
          <B key={i} p={[key.x, 0.0235, key.z]} s={[key.w, 0.0018, key.d]} c="plasticDark" radius={0.0009} seg={1} />
        ))}
        <B p={[0, 0.0226, 0.325]} s={[0.31, 0.0012, 0.185]} c="steel" radius={0.0006} seg={1} />
      </Merged>
      <mesh position={[LAPTOP_DECK.x, 0.02452, LAPTOP_DECK.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[LAPTOP_DECK.w, LAPTOP_DECK.d]} />
        <meshBasicMaterial map={legends} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.335, 0.02215, LAPTOP_DECK.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[0.04, LAPTOP_DECK.d]} />
          <meshBasicMaterial map={speaker} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <group ref={lid} position={[0, 0.032, -0.04]} rotation={[LID_CLOSED, 0, 0]}>
        <Merged>
          <B p={[0, 0.24, 0]} s={[0.76, 0.48, 0.014]} c="aluminum" radius={0.006} />
          <B p={[0, 0.24, 0.0075]} s={[0.73, 0.45, 0.002]} c="plasticDark" radius={0.001} seg={1} />
        </Merged>
        <mesh position={[0, 0.24, 0.0092]}>
          <planeGeometry args={[0.7, 0.43]} />
          <meshBasicMaterial color="#585659" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.24, 0.0096]}>
          <planeGeometry args={[0.43, 0.43]} />
          <meshBasicMaterial map={portrait} toneMapped={false} />
        </mesh>
        <mesh geometry={apple} position={[0, 0.24, -0.0078]} rotation={[0, Math.PI, 0]} scale={0.1}>
          <meshStandardMaterial color="#8e929a" roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function DeskObjects() {
  const { select, labelOf } = useSceneApi();
  const resume = useTexture(340, 460, drawResume);
  return (
    <>
      <Hotspot label={labelOf("monitor")} onTap={() => select("monitor")} labelAt={[0.2, 1.97, 0.44]} hit={{ p: [0.2, 1.38, 0.38], s: [1.56, 1, 0.14] }}>
        <MonitorScreen />
      </Hotspot>

      <Hotspot label={labelOf("about")} onTap={() => select("about")} labelAt={[1.45, 1.03, 0.72]} hit={{ p: [1.45, 0.92, 0.75], s: [0.82, 0.34, 0.66] }}>
        <MacBook />
      </Hotspot>

      <Hotspot label={labelOf("resume")} onTap={() => select("resume")} labelAt={[-1.2, 0.63, 1.32]} hit={{ p: [-1.2, 0.815, 1], s: [0.46, 0.05, 0.54] }}>
        <Contact p={[-1.19, 0.793, 0.98]} w={0.58} d={0.68} opacity={0.34} />
        <Merged cast={false}>
          <B p={[-1.19, 0.796, 0.98]} s={[0.36, 0.006, 0.48]} r={[0, -0.14, 0]} c="paper" radius={0.002} seg={1} />
          <B p={[-1.21, 0.802, 0.98]} s={[0.36, 0.006, 0.48]} r={[0, 0.12, 0]} c="white" radius={0.002} seg={1} />
          <B p={[-1.2, 0.808, 0.98]} s={[0.36, 0.006, 0.48]} r={[0, 0.06, 0]} c="paper" radius={0.002} seg={1} />
        </Merged>
        <Print p={[-1.2, 0.8125, 0.98]} r={[-Math.PI / 2, 0, 0.06]} w={0.35} h={0.47} map={resume} />
      </Hotspot>

      <Hotspot label={labelOf("phone")} onTap={() => select("phone")} labelAt={[-0.74, 1.3, 0.6]} hit={{ p: [-0.74, 0.99, 0.5], s: [0.3, 0.48, 0.26] }}>
        <PhoneOnStand />
      </Hotspot>
    </>
  );
}

function NamePlate({ name }: { name: string }) {
  const texture = useMemo(
    () =>
      makeTexture(256, 64, (c, w, h) => {
        c.fillStyle = "#c9a14f";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#2a1e0c";
        c.font = '700 34px "Bricolage Grotesque Variable", sans-serif';
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(name, w / 2, h / 2 + 2);
      }),
    [name],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.062, 0.1055]}>
      <planeGeometry args={[0.2, 0.05]} />
      <meshStandardMaterial map={texture} metalness={0.5} roughness={0.35} />
    </mesh>
  );
}

/** The Rumo logo mark: a root node branching into two. */
function RumoEmblem() {
  const y = 0.078;
  return (
    <Merged>
      <B p={[0, y + 0.31, 0]} s={[0.17, 0.1, 0.05]} c="rumoInk" radius={0.024} seg={3} />
      <Tube points={[[0, y + 0.27, 0], [-0.02, y + 0.2, 0], [-0.1, y + 0.17, 0], [-0.11, y + 0.11, 0]]} radius={0.01} c="rumoTan" segments={16} />
      <Tube points={[[0, y + 0.27, 0], [0.02, y + 0.2, 0], [0.1, y + 0.17, 0], [0.11, y + 0.11, 0]]} radius={0.01} c="rumoTan" segments={16} />
      <B p={[-0.11, y + 0.07, 0]} s={[0.13, 0.09, 0.04]} c="rumoInk" radius={0.02} seg={3} />
      <B p={[0.11, y + 0.07, 0]} s={[0.13, 0.09, 0.04]} c="rumoInk" radius={0.02} seg={3} />
      <B p={[-0.11, y + 0.07, 0.012]} s={[0.09, 0.052, 0.022]} c="white" radius={0.01} seg={2} />
      <B p={[0.11, y + 0.07, 0.012]} s={[0.09, 0.052, 0.022]} c="white" radius={0.01} seg={2} />
      <B p={[-0.11, y + 0.012, 0]} s={[0.05, 0.024, 0.03]} c="brass" radius={0.006} />
      <B p={[0.11, y + 0.012, 0]} s={[0.05, 0.024, 0.03]} c="brass" radius={0.006} />
    </Merged>
  );
}

function MoneyEmblem() {
  const face = useMemo(
    () =>
      makeTexture(160, 160, (c, w, h) => {
        c.fillStyle = "#f0c64f";
        c.beginPath();
        c.arc(w / 2, h / 2, 78, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#a97813";
        c.lineWidth = 6;
        c.beginPath();
        c.arc(w / 2, h / 2, 64, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = "#8a600e";
        c.font = '800 92px "Bricolage Grotesque Variable", sans-serif';
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("$", w / 2, h / 2 + 5);
      }),
    [],
  );
  useEffect(() => () => face.dispose(), [face]);
  const y = 0.1;
  return (
    <>
      <Merged>
        <B p={[0, y + 0.012, 0]} s={[0.3, 0.018, 0.15]} r={[0, 0.06, 0]} c="billDark" radius={0.004} />
        <B p={[0.004, y + 0.03, 0]} s={[0.3, 0.018, 0.15]} r={[0, -0.05, 0]} c="bill" radius={0.004} />
        {[0, 1, 2, 3].map((i) => (
          <Cyl key={i} p={[-0.09, y + 0.052 + i * 0.022, 0.015]} r={0.052} h={0.019} c={i % 2 ? "goldDark" : "gold"} seg={20} />
        ))}
        <Cyl p={[0.03, y + 0.2, -0.015]} r={0.105} h={0.024} c="goldDark" seg={32} rot={[Math.PI / 2, 0, 0]} />
        <B p={[0.03, y + 0.075, -0.015]} s={[0.05, 0.05, 0.05]} c="brass" radius={0.01} />
      </Merged>
      <mesh position={[0.03, y + 0.2, -0.002]}>
        <circleGeometry args={[0.1, 32]} />
        <meshStandardMaterial map={face} metalness={0.8} roughness={0.28} />
      </mesh>
    </>
  );
}

/** Raw data flowing through a pipe into a clean tank. */
function PipelineEmblem() {
  const y = 0.1;
  return (
    <Merged>
      <Cyl p={[-0.12, y + 0.17, 0]} r={0.058} h={0.26} c="tank" seg={22} />
      <Cyl p={[-0.12, y + 0.305, 0]} r={0.064} h={0.018} c="chrome" seg={22} />
      <Cyl p={[-0.12, y + 0.035, 0]} r={0.064} h={0.018} c="chrome" seg={22} />
      <Tube points={[[-0.06, y + 0.24, 0], [0.04, y + 0.24, 0], [0.11, y + 0.22, 0], [0.12, y + 0.14, 0]]} radius={0.016} c="pipe" segments={18} />
      <Cyl p={[-0.052, y + 0.24, 0]} r={0.025} h={0.012} c="chrome" seg={14} rot={[0, 0, Math.PI / 2]} />
      <Cyl p={[0.12, y + 0.14, 0]} r={0.025} h={0.012} c="chrome" seg={14} />
      <Cyl p={[0.12, y + 0.075, 0]} r={0.056} h={0.11} c="gold" seg={22} />
      <Cyl p={[0.12, y + 0.135, 0]} r={0.06} h={0.012} c="chrome" seg={22} />
      <Cyl p={[0.12, y + 0.018, 0]} r={0.06} h={0.012} c="chrome" seg={22} />
    </Merged>
  );
}

/** Side outline of the anvil body, from the foot up to the striking face. */
function anvilOutline() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.105, 0);
  shape.lineTo(0.105, 0);
  shape.lineTo(0.112, 0.022);
  shape.quadraticCurveTo(0.06, 0.04, 0.05, 0.085);
  shape.quadraticCurveTo(0.05, 0.125, 0.1, 0.138);
  shape.lineTo(0.15, 0.15);
  shape.lineTo(0.15, 0.19);
  shape.lineTo(-0.075, 0.19);
  shape.lineTo(-0.075, 0.14);
  shape.quadraticCurveTo(-0.05, 0.12, -0.05, 0.085);
  shape.quadraticCurveTo(-0.06, 0.04, -0.112, 0.022);
  shape.closePath();
  return shape;
}

/** An anvil forging a few glowing pixels, for Pixel Forge. */
function AnvilEmblem() {
  const y = 0.102;
  const pixels: Array<{ p: V3; color: string }> = [
    { p: [0.015, y + 0.216, 0.012], color: "#ff8a2a" },
    { p: [0.057, y + 0.216, -0.014], color: "#ffc247" },
    { p: [0.036, y + 0.254, 0], color: "#ff5f2e" },
  ];
  return (
    <>
      <Merged>
        <Extruded id="anvil" p={[0, y, 0]} shape={anvilOutline} depth={0.095} c="anvil" />
        {/* Horn tapering to a point */}
        <Turned
          p={[-0.074, y + 0.163, 0]}
          profile={[[0, 0], [0.043, 0], [0.04, 0.03], [0.028, 0.075], [0.012, 0.115], [0.003, 0.135], [0, 0.137]]}
          c="anvil"
          seg={20}
          r={[0, 0, Math.PI / 2]}
        />
        <B p={[0.038, y + 0.193, 0]} s={[0.21, 0.006, 0.1]} c="steel" radius={0.002} seg={1} />
      </Merged>
      {pixels.map((pixel) => (
        <mesh key={pixel.color} position={pixel.p}>
          <boxGeometry args={[0.038, 0.038, 0.038]} />
          <meshBasicMaterial color={pixel.color} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

const CELL_X = [2.55, 3.05, 3.55];
const TOP_ROW_FLOOR = 1.335;
const MIDDLE_ROW_FLOOR = 0.66;

function Trophy({ slug, label, x, floor = TOP_ROW_FLOOR, children }: { slug: string; label: string; x: number; floor?: number; children: ReactNode }) {
  const { select } = useSceneApi();
  const { hovered, handlers } = useTapHandlers(label, () => select("trophies", slug));
  return (
    <group position={[x, floor, 0.3]} scale={hovered ? 1.06 : 1}>
      <Merged>
        <B p={[0, 0.012, 0]} s={[0.31, 0.024, 0.25]} c="walnutDark" radius={0.008} />
        <B p={[0, 0.062, 0]} s={[0.27, 0.08, 0.21]} c="walnutDark" radius={0.01} />
      </Merged>
      <NamePlate name={label} />
      {children}
      <mesh position={[0, 0.25, 0.02]} scale={[0.46, 0.56, 0.4]} visible={false} {...handlers}>
        <boxGeometry />
      </mesh>
    </group>
  );
}

/** The middle drawer slides out when the other projects are open. */
function ProjectDrawer() {
  const { focus } = useSceneApi();
  const drawer = useRef<THREE.Group>(null);
  useFrame(({ invalidate }, delta) => {
    if (!drawer.current) return;
    const goal = focus === "extras" ? 0.36 : 0;
    const next = THREE.MathUtils.damp(drawer.current.position.z, goal, 6, Math.min(delta, 0.05));
    drawer.current.position.z = Math.abs(next - goal) < 0.001 ? goal : next;
    if (drawer.current.position.z !== goal) invalidate();
  });
  return (
    <group ref={drawer}>
      <Merged>
        <B p={[3.05, 0.34, 0.565]} s={[0.485, 0.56, 0.025]} c="walnut" radius={0.008} />
        <B p={[3.05, 0.5, 0.588]} s={[0.12, 0.012, 0.016]} c="brass" radius={0.005} />
        <B p={[3.05, 0.11, 0.33]} s={[0.46, 0.02, 0.46]} c="walnutDark" radius={0.004} seg={1} />
        <B p={[2.83, 0.28, 0.33]} s={[0.018, 0.34, 0.46]} c="walnut" radius={0.004} seg={1} />
        <B p={[3.27, 0.28, 0.33]} s={[0.018, 0.34, 0.46]} c="walnut" radius={0.004} seg={1} />
        <B p={[3.02, 0.13, 0.36]} s={[0.26, 0.012, 0.34]} r={[0, 0.08, 0]} c="paper" radius={0.002} seg={1} />
        <B p={[3.08, 0.142, 0.34]} s={[0.26, 0.012, 0.34]} r={[0, -0.12, 0]} c="white" radius={0.002} seg={1} />
      </Merged>
    </group>
  );
}

function TrophyShelf() {
  const { select, labelOf } = useSceneApi();
  return (
    <>
      <Merged>
        <B p={[3.05, 1.02, 0.03]} s={[1.6, 2.02, 0.03]} c="walnutDark" radius={0.004} seg={1} />
        <B p={[2.27, 1.02, 0.3]} s={[0.04, 2.04, 0.58]} c="walnut" radius={0.008} />
        <B p={[3.83, 1.02, 0.3]} s={[0.04, 2.04, 0.58]} c="walnut" radius={0.008} />
        <B p={[3.05, 2.04, 0.3]} s={[1.6, 0.04, 0.58]} c="walnut" radius={0.008} />
        {[0.64, 1.315].map((y) => (
          <B key={y} p={[3.05, y, 0.3]} s={[1.54, 0.04, 0.56]} c="walnut" radius={0.008} />
        ))}
        {[2.8, 3.3].map((x) => (
          <B key={x} p={[x, 1.34, 0.3]} s={[0.03, 1.38, 0.55]} c="walnut" radius={0.006} />
        ))}
        {/* Closed cabinet at the base */}
        {[2.55, 3.55].map((x) => (
          <group key={x}>
            <B p={[x, 0.34, 0.565]} s={[0.485, 0.56, 0.025]} c="walnut" radius={0.008} />
            <B p={[x, 0.5, 0.588]} s={[0.12, 0.012, 0.016]} c="brass" radius={0.005} />
          </group>
        ))}
        <B p={[3.05, 0.34, 0.33]} s={[0.47, 0.54, 0.44]} c="walnutDark" radius={0.004} seg={1} />
        <B p={[3.05, 0.03, 0.3]} s={[1.56, 0.06, 0.54]} c="blackMetal" radius={0.008} />
      </Merged>
      {/* Warm light strips under each shelf */}
      {[1.98, 1.262].map((y) =>
        CELL_X.map((x) => (
          <mesh key={`${x}${y}`} position={[x, y + 0.012, 0.45]}>
            <boxGeometry args={[0.42, 0.012, 0.012]} />
            <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
          </mesh>
        )),
      )}
      <Trophy slug="rumo" label="Rumo" x={CELL_X[0]}><RumoEmblem /></Trophy>
      <Trophy slug="fincore" label="FinCore" x={CELL_X[1]}><MoneyEmblem /></Trophy>
      <Trophy slug="fundlens" label="FundLens" x={CELL_X[2]}><PipelineEmblem /></Trophy>
      <Trophy slug="pixel-forge" label="Pixel Forge" x={CELL_X[0]} floor={MIDDLE_ROW_FLOOR}><AnvilEmblem /></Trophy>
      <Hotspot label={labelOf("trophies")} onTap={() => select("trophies")} labelAt={[2.9, 2.14, 0.62]} hit={{ p: [3.3, 1, 0.34], s: [0.98, 0.62, 0.4] }} />
      <Hotspot label={labelOf("extras")} onTap={() => select("extras")} labelAt={[3.05, 0.36, 0.72]} hit={{ p: [3.05, 0.33, 0.6], s: [1.52, 0.6, 0.08] }}>
        <ProjectDrawer />
      </Hotspot>
    </>
  );
}

/** A small kids' basketball hoop on a weighted base. */
function KidsHoop() {
  const strands = 12;
  return (
    <group position={[HOOP.x, 0, HOOP.z]} rotation={[0, HOOP.yaw, 0]}>
      <Merged>
        <B p={[0, 0.055, 0]} s={[0.56, 0.11, 0.62]} c="toyBlue" radius={0.05} seg={4} />
        <B p={[0, 0.115, -0.04]} s={[0.3, 0.03, 0.34]} c="toyYellow" radius={0.014} />
        {[-0.25, 0.25].map((side) => (
          <Cyl key={side} p={[side + Math.sign(side) * 0.05, 0.06, -0.24]} r={0.06} h={0.04} c="rubber" seg={20} rot={[0, 0, Math.PI / 2]} />
        ))}
        <Cyl p={[0, 0.17, -0.04]} r={0.042} r2={0.052} h={0.1} c="toyRed" seg={22} />
        <Cyl p={[0, 0.64, -0.04]} r={0.024} h={0.88} c="caseWhite" seg={18} />
        <Cyl p={[0, 0.82, -0.04]} r={0.031} h={0.05} c="toyRed" seg={18} />
        <Tube points={[[0, 1.06, -0.04], [0, 1.12, -0.03], [0, 1.14, 0.03]]} radius={0.022} c="caseWhite" segments={10} />
        <B p={[0, 1.13, 0.05]} s={[0.62, 0.42, 0.028]} c="caseWhite" radius={0.024} seg={3} />
        <B p={[0, 1.13, 0.066]} s={[0.56, 0.36, 0.004]} c="toyBlue" radius={0.012} seg={1} />
        <B p={[0, 1.09, 0.07]} s={[0.26, 0.2, 0.004]} c="caseWhite" radius={0.006} seg={1} />
        <B p={[0, 1.09, 0.073]} s={[0.21, 0.15, 0.004]} c="toyBlue" radius={0.004} seg={1} />
        <B p={[0, 1, 0.095]} s={[0.12, 0.035, 0.06]} c="toyRed" radius={0.01} />
        <Ring p={[0, HOOP.rimY, HOOP.rimZ]} r={HOOP.rimRadius} tube={0.012} c="toyRed" rot={[Math.PI / 2, 0, 0]} />
        <Ring p={[0, 0.9, HOOP.rimZ]} r={HOOP.rimRadius * 0.82} tube={0.003} c="white" rot={[Math.PI / 2, 0, 0]} />
        <Ring p={[0, 0.81, HOOP.rimZ]} r={HOOP.rimRadius * 0.7} tube={0.003} c="white" rot={[Math.PI / 2, 0, 0]} />
        {Array.from({ length: strands }, (_, i) => {
          const a = (i / strands) * Math.PI * 2;
          const b = a + Math.PI / strands;
          const at = (angle: number, radius: number, y: number): V3 => [Math.cos(angle) * radius, y, HOOP.rimZ + Math.sin(angle) * radius];
          return <Tube key={i} points={[at(a, HOOP.rimRadius - 0.002, 0.995), at(b, HOOP.rimRadius * 0.82, 0.9), at(a, HOOP.rimRadius * 0.7, 0.81)]} radius={0.0024} c="white" segments={6} />;
        })}
      </Merged>
      <SecretDot id="sports" p={[0.4, 1.3, 0.08]} />
    </group>
  );
}

function DogBed({ p, color, radius }: { p: V3; color: string; radius: number }) {
  const scale = radius / 0.33;
  return (
    <group position={p} scale={[scale, scale, scale]}>
      <Merged>
        <Turned
          p={[0, 0, 0]}
          profile={[[0, 0], [0.29, 0], [0.33, 0.035], [0.34, 0.085], [0.315, 0.135], [0.27, 0.15], [0.225, 0.13], [0.2, 0.08], [0, 0.055]]}
          c={color}
          seg={40}
        />
        <Turned p={[0, 0.05, 0]} profile={[[0, 0.035], [0.15, 0.03], [0.205, 0.015], [0.21, 0]]} c="bedCream" seg={32} />
      </Merged>
    </group>
  );
}

/** Asleep by default. When something moves nearby, the eyes open for a moment. */
function DogEyes({ x, y, z, size }: { x: number; y: number; z: number; size: number }) {
  const closed = useRef<THREE.Group>(null);
  const open = useRef<THREE.Group>(null);
  useFrame(() => {
    const awake = performance.now() < dogAlert.until;
    if (closed.current) closed.current.visible = !awake;
    if (open.current) open.current.visible = awake;
  });
  return (
    <>
      <group ref={closed}>
        <Merged cast={false}>
          {[-1, 1].map((side) => (
            <Ring key={side} p={[side * x, y, z]} r={size} tube={size * 0.2} c="dogNose" rot={[0.12, 0, Math.PI]} arc={Math.PI} />
          ))}
        </Merged>
      </group>
      <group ref={open} visible={false}>
        <Merged cast={false}>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Ball p={[side * x, y, z]} r={size * 1.08} s={[1, 1.06, 0.62]} c="eyeBlack" />
              <Ball p={[side * x - size * 0.34, y + size * 0.4, z + size * 0.58]} r={size * 0.32} c="spitzLight" />
            </group>
          ))}
        </Merged>
      </group>
    </>
  );
}

const SPITZ_BODY: TuftPatch[] = [
  { c: [0, 0.095, -0.085], r: [0.166, 0.098, 0.195], count: 620, length: 0.048, width: 0.011, flow: [0, -0.3, -1], lift: 0.45 },
  { c: [0, 0.115, 0.04], r: [0.136, 0.1, 0.096], count: 520, length: 0.052, width: 0.011, flow: [0, -1, 0.25], lift: 0.5 },
  { c: [-0.08, 0.122, 0.112], r: [0.052, 0.056, 0.05], count: 150, length: 0.04, width: 0.008, flow: [-1, -0.6, 0], lift: 0.5 },
  { c: [0.08, 0.122, 0.112], r: [0.052, 0.056, 0.05], count: 150, length: 0.04, width: 0.008, flow: [1, -0.6, 0], lift: 0.5 },
  { c: [0.09, 0.205, -0.19], r: [0.098, 0.058, 0.088], count: 300, length: 0.052, width: 0.01, flow: [0.7, -0.5, -0.4], lift: 0.5 },
];
const SPITZ_SHADE: TuftPatch[] = [
  { c: [0, 0.088, -0.07], r: [0.165, 0.095, 0.195], count: 170, length: 0.04, width: 0.01, flow: [0, -1, -0.5], lift: 0.4 },
  { c: [0, 0.082, 0.08], r: [0.1, 0.06, 0.075], count: 110, length: 0.038, width: 0.008, flow: [0, -1, 0.2], lift: 0.4 },
];
const SPITZ_FACE: TuftPatch[] = [{ c: [0, 0.15, 0.136], r: [0.082, 0.074, 0.068], count: 300, length: 0.018, width: 0.005, flow: [0, 0.35, -1], lift: 0.28 }];

/** A white German Spitz lying down, with its chin on its paws and its face forward. */
function SpitzDog() {
  return (
    <group position={[0.34, 0.058, 0.9]} rotation={[0, -0.05, 0]}>
      <Merged>
        <Fuzzy p={[0, 0.095, -0.085]} s={[0.168, 0.1, 0.198]} c="spitz" seed={1.3} amount={0.06} />
        <Fuzzy p={[0, 0.115, 0.04]} s={[0.138, 0.102, 0.098]} c="spitz" seed={4.1} amount={0.07} />
        <Fuzzy p={[0, 0.15, 0.136]} s={[0.082, 0.076, 0.07]} c="spitz" seed={5.5} amount={0.04} />
        <Fuzzy p={[0.09, 0.205, -0.19]} s={[0.094, 0.056, 0.084]} r={[0.1, 0.3, -0.2]} c="spitz" seed={3.2} amount={0.12} />
        <Tufts id="spitz-lying-body" seed={1.1} patches={SPITZ_BODY} c="spitz" />
        <Tufts id="spitz-lying-shade" seed={2.2} patches={SPITZ_SHADE} c="spitzShade" />
        <Tufts id="spitz-lying-face" seed={3.3} patches={SPITZ_FACE} c="spitzLight" />
        <Ball p={[0, 0.122, 0.198]} r={0.034} s={[0.92, 0.72, 1.05]} c="spitzLight" />
        <Ball p={[0, 0.135, 0.232]} r={0.0125} s={[1.2, 0.86, 0.72]} c="dogNose" />
        <B p={[0, 0.114, 0.2345]} s={[0.0022, 0.016, 0.002]} c="dogNose" radius={0.0008} seg={1} />
        <Ring p={[-0.0095, 0.107, 0.2295]} r={0.0095} tube={0.0016} c="dogNose" rot={[0.2, 0, Math.PI]} arc={Math.PI} />
        <Ring p={[0.0095, 0.107, 0.2295]} r={0.0095} tube={0.0016} c="dogNose" rot={[0.2, 0, Math.PI]} arc={Math.PI} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Turned p={[side * 0.052, 0.2, 0.115]} profile={[[0, 0], [0.032, 0], [0.024, 0.035], [0.006, 0.066], [0, 0.07]]} c="spitz" seg={14} r={[0.08, 0, -side * 0.3]} scale={[1, 1, 0.55]} />
            <Turned p={[side * 0.053, 0.208, 0.129]} profile={[[0, 0], [0.018, 0], [0.012, 0.024], [0.002, 0.042], [0, 0.044]]} c="earPink" seg={10} r={[0.08, 0, -side * 0.3]} scale={[1, 1, 0.3]} />
            <Fuzzy p={[side * 0.055, 0.03, 0.2]} s={[0.04, 0.028, 0.08]} c="spitzLight" seed={8.4 + side} amount={0.07} />
          </group>
        ))}
      </Merged>
      <DogEyes x={0.04} y={0.166} z={0.2} size={0.013} />
    </group>
  );
}

const yorkPatch = (count: number, scale = 1): TuftPatch[] => [
  { c: [0, 0.075, -0.07], r: [0.118, 0.078, 0.155], count, length: 0.04 * scale, width: 0.006, flow: [0, -1, -0.25], lift: 0.05, jitter: 0.09 },
  { c: [0, 0.09, 0.035], r: [0.085, 0.075, 0.07], count: Math.round(count * 0.55), length: 0.034 * scale, width: 0.006, flow: [0, -1, 0.08], lift: 0.05, jitter: 0.09 },
];
const YORK_FACE: TuftPatch[] = [{ c: [0, 0.122, 0.105], r: [0.062, 0.058, 0.054], count: 280, length: 0.018, width: 0.004, flow: [0, -0.4, -1], lift: 0.2 }];
const YORK_BEARD: TuftPatch[] = [{ c: [0, 0.09, 0.15], r: [0.034, 0.018, 0.03], count: 110, length: 0.034, width: 0.0035, flow: [0, -1, 0.1], lift: 0.15 }];
const YORK_TOP: TuftPatch[] = [{ c: [0, 0.172, 0.098], r: [0.034, 0.018, 0.034], count: 90, length: 0.032, width: 0.004, flow: [0, 0.2, -1], lift: 0.5 }];

/** A Yorkshire lying down, with a gray body and its tan face forward. */
function YorkshireDog() {
  return (
    <group position={[1.2, 0.056, 0.9]} rotation={[0, -0.12, 0]} scale={1.12}>
      <Merged>
        <Fuzzy p={[0, 0.075, -0.07]} s={[0.118, 0.08, 0.157]} c="yorkBlue" seed={9.1} amount={0.05} />
        <Fuzzy p={[0, 0.09, 0.035]} s={[0.086, 0.077, 0.072]} c="yorkBlue" seed={12.3} amount={0.05} />
        <Fuzzy p={[0, 0.122, 0.105]} s={[0.061, 0.057, 0.054]} c="yorkTan" seed={13.7} amount={0.04} />
        <Tufts id="york-lying-gray" seed={4.4} patches={yorkPatch(560)} c="yorkBlue" />
        <Tufts id="york-lying-silver" seed={5.5} patches={yorkPatch(300, 0.95)} c="yorkSilver" />
        <Tufts id="york-lying-dark" seed={8.8} patches={yorkPatch(170, 0.9)} c="yorkDark" />
        <Tufts id="york-lying-face" seed={9.9} patches={YORK_FACE} c="yorkTan" />
        <Tufts id="york-lying-face-gold" seed={10.1} patches={YORK_FACE.map((patch) => ({ ...patch, count: 120 }))} c="yorkGold" />
        <Tufts id="york-lying-beard" seed={11.1} patches={YORK_BEARD} c="yorkGold" />
        <Tufts id="york-lying-top" seed={12.2} patches={YORK_TOP} c="yorkTan" />
        <Ball p={[0, 0.102, 0.149]} r={0.024} s={[0.92, 0.74, 1]} c="yorkGold" />
        <Ball p={[0, 0.111, 0.171]} r={0.0095} s={[1.2, 0.86, 0.72]} c="dogNose" />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Turned p={[side * 0.04, 0.158, 0.09]} profile={[[0, 0], [0.023, 0], [0.016, 0.028], [0.003, 0.052], [0, 0.055]]} c="yorkTan" seg={12} r={[0.05, 0, -side * 0.28]} scale={[1, 1, 0.45]} />
            <Fuzzy p={[side * 0.04, 0.024, 0.155]} s={[0.027, 0.023, 0.056]} c="yorkTan" seed={15.1 + side} amount={0.08} />
          </group>
        ))}
      </Merged>
      <DogEyes x={0.028} y={0.136} z={0.153} size={0.01} />
    </group>
  );
}

function Dogs() {
  return (
    <>
      <DogBed p={[0.34, 0.002, 0.9]} color="bedTeal" radius={0.33} />
      <SpitzDog />
      <DogBed p={[1.2, 0.002, 0.9]} color="bedRust" radius={0.29} />
      <YorkshireDog />
    </>
  );
}

/** A small soccer goal flat against the left wall, with a tidy square net. */
function SoccerGoal() {
  const { width, height, depth } = GOAL;
  const half = width / 2;
  const slope = Math.hypot(height, depth);
  const tilt = Math.atan2(depth, height);
  const columns = 8;
  const rows = 4;
  const sideSteps = [0.25, 0.5, 0.75];
  const string = 0.0042;
  return (
    <group position={[GOAL.x, 0, GOAL.z]} rotation={[0, GOAL.yaw, 0]}>
      <Merged>
        <Cyl p={[0, height, 0]} r={0.02} h={width + 0.04} c="caseWhite" seg={14} rot={[0, 0, Math.PI / 2]} />
        <Cyl p={[0, 0.014, -depth]} r={0.014} h={width} c="caseWhite" seg={12} rot={[0, 0, Math.PI / 2]} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Cyl p={[side * half, height / 2, 0]} r={0.02} h={height} c="caseWhite" seg={14} />
            <Ball p={[side * half, height, 0]} r={0.022} c="caseWhite" />
            <B p={[side * half, 0.012, -depth / 2]} s={[0.024, 0.024, depth]} c="caseWhite" radius={0.008} />
            <B p={[side * half, height / 2, -depth / 2]} s={[0.016, slope, 0.016]} r={[tilt, 0, 0]} c="caseWhite" radius={0.006} />
            {sideSteps.map((k) => (
              <group key={k}>
                <B p={[side * half, height * k, (-depth * (1 - k)) / 2]} s={[string, string, depth * (1 - k)]} c="white" radius={0.001} seg={1} />
                <B p={[side * half, (height * (1 - k)) / 2, -depth * k]} s={[string, height * (1 - k), string]} c="white" radius={0.001} seg={1} />
              </group>
            ))}
          </group>
        ))}
        {Array.from({ length: columns - 1 }, (_, i) => (
          <B key={`c${i}`} p={[-half + (width * (i + 1)) / columns, height / 2, -depth / 2]} s={[string, slope, string]} r={[tilt, 0, 0]} c="white" radius={0.001} seg={1} />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => {
          const k = (i + 1) / rows;
          return <B key={`r${i}`} p={[0, height * k, -depth * (1 - k)]} s={[width, string, string]} c="white" radius={0.001} seg={1} />;
        })}
      </Merged>
    </group>
  );
}

/** A flat apple with a bite and a leaf, one unit tall. */
function appleGeometry() {
  const body = new THREE.Shape();
  body.moveTo(0, 0.2);
  body.bezierCurveTo(-0.12, 0.3, -0.42, 0.3, -0.46, 0.02);
  body.bezierCurveTo(-0.49, -0.2, -0.32, -0.5, -0.18, -0.5);
  body.bezierCurveTo(-0.1, -0.5, -0.07, -0.45, 0, -0.45);
  body.bezierCurveTo(0.07, -0.45, 0.1, -0.5, 0.18, -0.5);
  body.bezierCurveTo(0.3, -0.5, 0.42, -0.3, 0.46, -0.16);
  body.bezierCurveTo(0.3, -0.1, 0.26, 0.16, 0.42, 0.24);
  body.bezierCurveTo(0.34, 0.33, 0.12, 0.3, 0, 0.2);
  const leaf = new THREE.Shape();
  leaf.moveTo(0.015, 0.26);
  leaf.bezierCurveTo(0.02, 0.4, 0.12, 0.5, 0.24, 0.52);
  leaf.bezierCurveTo(0.25, 0.38, 0.15, 0.27, 0.015, 0.26);
  return new THREE.ShapeGeometry([body, leaf], 14);
}

/** A Mac mini tucked under the monitor. */
function MacMini() {
  const apple = useMemo(appleGeometry, []);
  useEffect(() => () => apple.dispose(), [apple]);
  const { x, y, z, size, height, foot } = MINI;
  const middle = y + foot + height / 2;
  const front = z + size / 2;
  const portY = y + foot + height * 0.42;
  return (
    <>
      <Contact p={[x, y + 0.003, z]} w={size + 0.2} d={size + 0.2} opacity={0.42} />
      <Merged>
        <Cyl p={[x, y + foot / 2, z]} r={size * 0.42} h={foot} c="rubber" seg={32} />
        <B p={[x, middle, z]} s={[size, height, size]} c="aluminum" radius={0.026} seg={4} />
        {[-0.098, -0.066].map((offset) => (
          <B key={offset} p={[x + offset, portY, front + 0.0004]} s={[0.021, 0.008, 0.002]} c="glassBlack" radius={0.0035} seg={1} />
        ))}
        <Cyl p={[x - 0.036, portY, front + 0.0004]} r={0.0048} h={0.002} c="glassBlack" seg={14} rot={[Math.PI / 2, 0, 0]} />
      </Merged>
      <mesh geometry={apple} position={[x, y + foot + height + 0.0009, z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.085}>
        <meshStandardMaterial color="#25272d" roughness={0.32} metalness={0.55} />
      </mesh>
    </>
  );
}

const PC = { x: -1.05, z: 0.62, w: 0.34, h: 0.64, d: 0.6, floor: 0.035 };

function RgbFan({ p, ring, phase, running }: { p: V3; ring: THREE.Texture; phase: number; running: RefObject<boolean> }) {
  const blades = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!running.current) return;
    const t = clock.elapsedTime;
    if (blades.current) blades.current.rotation.z = -t * 5 + phase;
    if (halo.current) halo.current.rotation.z = t * 0.9 + phase;
  });
  return (
    <group position={p}>
      <mesh ref={halo} rotation={[0, 0, phase]}>
        <ringGeometry args={[0.066, 0.083, 48]} />
        <meshBasicMaterial map={ring} toneMapped={false} />
      </mesh>
      <group ref={blades} position={[0, 0, 0.003]} rotation={[0, 0, phase]}>
        <Merged cast={false}>
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return <B key={i} p={[Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0]} s={[0.05, 0.022, 0.002]} r={[0.3, 0, a + 0.45]} c="caseWhite" radius={0.001} seg={1} />;
          })}
          <Cyl p={[0, 0, 0.002]} r={0.019} h={0.006} c="caseWhite" seg={18} rot={[Math.PI / 2, 0, 0]} />
        </Merged>
      </group>
    </group>
  );
}

/** A white glass-front PC with spinning RGB fans. */
function GamingPC() {
  const { labelOf } = useSceneApi();
  const invalidate = useThree((state) => state.invalidate);
  const running = useRef(false);
  const { handlers } = useTapHandlers(labelOf("pc"), () => {
    running.current = !running.current;
    invalidate();
  });
  const ring = useTexture(256, 256, drawRainbowRing);
  const strip = useMemo(() => {
    const texture = makeTexture(8, 256, drawRainbowStrip);
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  useEffect(() => () => strip.dispose(), [strip]);
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock, invalidate: redraw }) => {
    const t = clock.elapsedTime;
    if (running.current) {
      strip.offset.y = t * 0.16;
      redraw();
    }
    if (glow.current) {
      glow.current.color.setHSL(running.current ? (t * 0.08) % 1 : 0.74, 0.9, 0.58);
      glow.current.opacity = THREE.MathUtils.lerp(0.42, 0.07, Math.max(daylight.value, 0));
    }
  });

  const { x, z, w, h, d, floor } = PC;
  const middle = floor + h / 2;
  const top = floor + h;
  const front = z + d / 2;
  return (
    <>
      <mesh position={[x, 0.036, front + 0.3]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[1.05, 0.75]} />
        <meshBasicMaterial ref={glow} map={glowTexture()} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <Merged>
        <B p={[x, top - 0.012, z]} s={[w, 0.024, d]} c="caseWhite" radius={0.01} />
        <B p={[x, floor + 0.012, z]} s={[w, 0.024, d]} c="caseWhite" radius={0.01} />
        <B p={[x - w / 2 + 0.009, middle, z]} s={[0.018, h, d]} c="caseWhite" radius={0.007} />
        <B p={[x + w / 2 - 0.009, middle, z]} s={[0.018, h, d]} c="caseWhite" radius={0.007} />
        <B p={[x, middle, z - d / 2 + 0.01]} s={[w, h, 0.02]} c="caseWhite" radius={0.006} />
        <B p={[x, middle, front - 0.07]} s={[w - 0.036, h - 0.05, 0.012]} c="caseInner" radius={0.003} seg={1} />
        <B p={[x, top - 0.03, front - 0.008]} s={[w, 0.06, 0.018]} c="caseWhite" radius={0.007} />
        <B p={[x, floor + 0.016, front - 0.008]} s={[w, 0.032, 0.018]} c="caseWhite" radius={0.006} />
        <B p={[x - w / 2 + 0.012, middle, front - 0.008]} s={[0.024, h, 0.018]} c="caseWhite" radius={0.006} />
        <B p={[x + w / 2 - 0.012, middle, front - 0.008]} s={[0.024, h, 0.018]} c="caseWhite" radius={0.006} />
        <Cyl p={[x + 0.1, top - 0.03, front + 0.003]} r={0.012} h={0.006} c="steel" seg={18} rot={[Math.PI / 2, 0, 0]} />
        <B p={[x - 0.1, top - 0.03, front + 0.002]} s={[0.034, 0.011, 0.003]} c="plasticDark" radius={0.001} seg={1} />
        <B p={[x - 0.05, top - 0.03, front + 0.002]} s={[0.034, 0.011, 0.003]} c="plasticDark" radius={0.001} seg={1} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
          <Cyl key={`${sx}${sz}`} p={[x + sx * (w / 2 - 0.04), 0.018, z + sz * (d / 2 - 0.05)]} r={0.022} h={0.034} c="rubber" seg={14} />
        ))}
      </Merged>
      {[-0.19, 0, 0.19].map((offset, i) => (
        <RgbFan key={offset} p={[x, middle - 0.014 + offset, front - 0.056]} ring={ring} phase={i * 1.4} running={running} />
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * (w / 2 - 0.032), middle - 0.014, front - 0.058]}>
          <planeGeometry args={[0.007, h - 0.12]} />
          <meshBasicMaterial map={strip} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[x, middle - 0.014, front - 0.002]} renderOrder={3}>
        <planeGeometry args={[w - 0.05, h - 0.1]} />
        <meshStandardMaterial color="#dfe8f5" transparent opacity={0.1} roughness={0.06} metalness={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[x, middle, z + 0.02]} scale={[w + 0.02, h, d]} visible={false} {...handlers}>
        <boxGeometry />
      </mesh>
    </>
  );
}

export function Office() {
  return (
    <group>
      <Shell />
      <OutsideView />
      <WindowWithCurtain />
      <Wall />
      <Racket />
      <HiddenNote />
      <Desk />
      <DeskObjects />
      <TrophyShelf />
      <OfficeChair />
      <Plant />
      <KidsHoop />
      <Balls />
      <MacMini />
      {FEATURES.gamingPc && <GamingPC />}
      {FEATURES.dogs && <Dogs />}
      <SoccerGoal />
    </group>
  );
}
