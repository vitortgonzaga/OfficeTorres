import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SpotId } from "../content/site";

/** Center, width and height of what each tour step circles. */
const TARGETS: Partial<Record<SpotId, { c: [number, number, number]; w: number; h: number }>> = {
  about: { c: [1.45, 0.82, 0.95], w: 0.92, h: 0.2 },
  stack: { c: [-1.34, 2.87, 0.05], w: 0.86, h: 1.02 },
  cork: { c: [0.22, 2.78, 0.05], w: 2.2, h: 1.22 },
  trophies: { c: [3.05, 1.42, 0.5], w: 1.82, h: 1.5 },
  resume: { c: [-1.2, 0.82, 0.98], w: 0.62, h: 0.36 },
  phone: { c: [-0.74, 0.99, 0.5], w: 0.36, h: 0.56 },
};

const PADDING = 12;
const EDGE = 46;
const SVG = "http://www.w3.org/2000/svg";

/** A marker scribble that goes around twice and never quite closes. */
function scribble(w: number, h: number) {
  const p = (x: number, y: number) => `${((x / 200) * w).toFixed(1)} ${((y / 120) * h).toFixed(1)}`;
  return `M${p(30, 24)} C${p(70, 0)} ${p(152, 2)} ${p(186, 32)} C${p(210, 62)} ${p(178, 108)} ${p(104, 114)} C${p(40, 120)} ${p(-4, 94)} ${p(6, 56)} C${p(14, 22)} ${p(64, 4)} ${p(122, 9)} C${p(162, 13)} ${p(198, 32)} ${p(197, 60)}`;
}

function sparks(w: number) {
  return `M${w + 9} -4 l13 -13 M${w + 19} 13 l17 -4 M${w - 9} -11 l3 -17`;
}

function svgPart(parent: Element, tag: string, className: string, attributes: Record<string, string> = {}) {
  const part = document.createElementNS(SVG, tag);
  part.setAttribute("class", className);
  Object.entries(attributes).forEach(([key, value]) => part.setAttribute(key, value));
  parent.appendChild(part);
  return part;
}

/** A hand-drawn circle around the next object, drawn by the browser, not the 3D scene. */
export function TourMarker({ target }: { target: SpotId | null }) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const parts = useRef<{ root: HTMLDivElement; lines: Element[]; spark: Element; compass: HTMLDivElement; w: number; h: number } | null>(null);
  const point = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!target || !parent) return;
    const root = document.createElement("div");
    root.className = "tour-mark";
    root.setAttribute("aria-hidden", "true");
    const ring = svgPart(root, "svg", "tour-ring");
    const lines = [svgPart(ring, "path", "under", { pathLength: "1" }), svgPart(ring, "path", "ink", { pathLength: "1" })];
    const spark = svgPart(ring, "path", "spark");
    const compass = document.createElement("div");
    compass.className = "tour-compass";
    const arrow = svgPart(compass, "svg", "", { viewBox: "0 0 64 64" });
    ["under", "ink"].forEach((name) => svgPart(arrow, "path", name, { d: "M6 36 C20 22 36 24 56 31 M42 17 L58 32 L42 45" }));
    parent.append(root, compass);
    parts.current = { root, lines, spark, compass, w: 0, h: 0 };
    invalidate();
    return () => {
      root.remove();
      compass.remove();
      parts.current = null;
    };
  }, [gl, target, invalidate]);

  useFrame(() => {
    const current = parts.current;
    const box = target ? TARGETS[target] : undefined;
    if (!current || !box) return;
    camera.updateMatrixWorld();
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      point.set(box.c[0] + (sx * box.w) / 2, box.c[1] + (sy * box.h) / 2, box.c[2]).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const middleX = (left + right) / 2;
    const middleY = (top + bottom) / 2;
    const visible = middleX > 0 && middleX < size.width && middleY > 0 && middleY < size.height;
    current.root.style.display = visible ? "block" : "none";
    current.compass.style.display = visible ? "none" : "block";
    if (!visible) {
      const angle = Math.atan2(middleY - size.height / 2, middleX - size.width / 2);
      const reach = Math.min((size.width / 2 - EDGE) / Math.max(Math.abs(Math.cos(angle)), 0.001), (size.height / 2 - EDGE) / Math.max(Math.abs(Math.sin(angle)), 0.001));
      current.compass.style.transform = `translate(${size.width / 2 + Math.cos(angle) * reach - 26}px, ${size.height / 2 + Math.sin(angle) * reach - 26}px) rotate(${angle}rad)`;
      return;
    }
    const w = right - left + PADDING * 2;
    const h = bottom - top + PADDING * 2;
    current.root.style.transform = `translate(${left - PADDING}px, ${top - PADDING}px)`;
    current.root.style.width = `${w}px`;
    current.root.style.height = `${h}px`;
    if (Math.abs(w - current.w) > 0.5 || Math.abs(h - current.h) > 0.5) {
      const path = scribble(w, h);
      current.lines.forEach((line) => line.setAttribute("d", path));
      current.spark.setAttribute("d", sparks(w));
      current.w = w;
      current.h = h;
    }
  });

  return null;
}
