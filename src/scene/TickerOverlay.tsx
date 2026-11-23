import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { liveBalls } from "./ballInput";
import { drawTicker } from "./textures";

export const TICKER = { x: 2.54, y: 3.46, z: 0.072, w: 2.5, h: 0.15 };

const LOOP_MS = 26000;
const ART_WIDTH = 1536;
const ART_HEIGHT = 64;
/** How much of the artwork fits on the screen, so the letters keep their shape. */
export const TICKER_REPEAT = (TICKER.w / TICKER.h) / (ART_WIDTH / ART_HEIGHT);
const STRIP_WIDTH = ART_WIDTH * TICKER_REPEAT;
const STRIP_HEIGHT = ART_HEIGHT;

/** The same position the page animation is at, so the 3D screen never drifts from it. */
export const tickerPhase = () => (performance.now() % LOOP_MS) / LOOP_MS;

type Point = { x: number; y: number };

/** The CSS matrix that places a flat rectangle exactly over four points on screen. */
function quadMatrix([p0, p1, p2, p3]: Point[]) {
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const w = STRIP_WIDTH;
  const t = STRIP_HEIGHT;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / t},${e / t},0,${h / t},0,0,1,0,${p0.x},${p0.y},0,1)`;
}

/**
 * The scrolling text is a page animation laid over the 3D screen. The browser moves it
 * on its own, so the ticker runs all the time while the office draws zero frames.
 */
export function TickerOverlay({ reduced }: { reduced: boolean }) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const root = useRef<HTMLDivElement | null>(null);
  const placed = useRef("");
  const corners = useMemo(
    () => [
      new THREE.Vector3(TICKER.x - TICKER.w / 2, TICKER.y + TICKER.h / 2, TICKER.z),
      new THREE.Vector3(TICKER.x + TICKER.w / 2, TICKER.y + TICKER.h / 2, TICKER.z),
      new THREE.Vector3(TICKER.x + TICKER.w / 2, TICKER.y - TICKER.h / 2, TICKER.z),
      new THREE.Vector3(TICKER.x - TICKER.w / 2, TICKER.y - TICKER.h / 2, TICKER.z),
    ],
    [],
  );
  const point = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (reduced || !parent) return;
    const canvas = document.createElement("canvas");
    canvas.width = ART_WIDTH;
    canvas.height = ART_HEIGHT;
    drawTicker(canvas.getContext("2d")!, canvas.width, canvas.height);

    const element = document.createElement("div");
    element.className = "ticker-live";
    element.setAttribute("aria-hidden", "true");
    element.style.width = `${STRIP_WIDTH}px`;
    element.style.height = `${STRIP_HEIGHT}px`;
    const strip = document.createElement("div");
    strip.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
    strip.style.width = `${ART_WIDTH * 2}px`;
    strip.style.backgroundSize = `${ART_WIDTH}px ${ART_HEIGHT}px`;
    element.appendChild(strip);
    parent.appendChild(element);
    root.current = element;

    const animation = strip.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: LOOP_MS, iterations: Infinity });
    animation.startTime = 0;
    placed.current = "";
    invalidate();
    return () => {
      animation.cancel();
      element.remove();
      root.current = null;
    };
  }, [gl, reduced, invalidate]);

  useFrame(() => {
    const element = root.current;
    if (!element) return;
    camera.updateMatrixWorld();
    const screen = corners.map((corner) => {
      point.copy(corner).project(camera);
      return { x: ((point.x + 1) / 2) * size.width, y: ((1 - point.y) / 2) * size.height };
    });
    const transform = quadMatrix(screen);
    if (transform !== placed.current) {
      element.style.transform = transform;
      placed.current = transform;
    }

    // A ball flying in front of the screen must stay in front of the text too.
    const left = Math.min(...screen.map((p) => p.x));
    const right = Math.max(...screen.map((p) => p.x));
    const top = Math.min(...screen.map((p) => p.y));
    const bottom = Math.max(...screen.map((p) => p.y));
    const pixelsPerUnit = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const covered = liveBalls.some((ball) => {
      const reach = (ball.radius * pixelsPerUnit) / camera.position.distanceTo(ball.position);
      point.copy(ball.position).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      return x > left - reach && x < right + reach && y > top - reach && y < bottom + reach;
    });
    element.style.opacity = covered ? "0" : "1";
  });

  return null;
}
