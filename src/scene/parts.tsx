import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mat } from "./materials";
import { FUR_DETAIL, TUFT_SCALE } from "./quality";

export type V3 = [number, number, number];
type Euler3 = [number, number, number, THREE.EulerOrder?];

const geometries = new Map<string, THREE.BufferGeometry>();
const MERGE = { merge: true };

function cached(key: string, make: () => THREE.BufferGeometry) {
  let geometry = geometries.get(key);
  if (!geometry) geometries.set(key, (geometry = make()));
  return geometry;
}

/** A box with softened edges. Real objects have no perfectly sharp corners. */
export function B({ p, s, c, r, radius, seg = 2 }: { p: V3; s: V3; c: string; r?: Euler3; radius?: number; seg?: number }) {
  const smallest = Math.min(...s);
  const edge = Math.min(radius ?? 0.014, smallest * 0.48);
  const geometry = cached(`b${s.join()}:${edge}:${seg}`, () => new RoundedBoxGeometry(s[0], s[1], s[2], seg, edge));
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={r} userData={MERGE} />;
}

/** A shape turned around Y from a side profile of [radius, height] points. */
export function Turned({ p, profile, c, seg = 32, r, scale }: { p: V3; profile: Array<[number, number]>; c: string; seg?: number; r?: Euler3; scale?: V3 }) {
  const geometry = cached(`l${profile.join()}:${seg}`, () => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg));
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={r} scale={scale} userData={MERGE} />;
}

/** A cylinder with a small bevel on both ends. */
export function Cyl({ p, r, r2, h, c, seg = 28, rot }: { p: V3; r: number; r2?: number; h: number; c: string; seg?: number; rot?: Euler3 }) {
  const bottom = r2 ?? r;
  const bevel = Math.min(0.006, h * 0.2, r * 0.2);
  const profile: Array<[number, number]> = [
    [0, -h / 2],
    [bottom - bevel, -h / 2],
    [bottom, -h / 2 + bevel],
    [r, h / 2 - bevel],
    [r - bevel, h / 2],
    [0, h / 2],
  ];
  return <Turned p={p} profile={profile} c={c} seg={seg} r={rot} />;
}

export function Ball({ p, r, c, s }: { p: V3; r: number; c: string; s?: V3 }) {
  const geometry = cached(`s${r}`, () => new THREE.SphereGeometry(r, 20, 14));
  return <mesh geometry={geometry} material={mat(c)} position={p} scale={s} userData={MERGE} />;
}

export function Ring({ p, r, tube, c, rot, arc = Math.PI * 2 }: { p: V3; r: number; tube: number; c: string; rot?: Euler3; arc?: number }) {
  const geometry = cached(`t${r}:${tube}:${arc}`, () => new THREE.TorusGeometry(r, tube, 10, 36, arc));
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={rot} userData={MERGE} />;
}

/** A round bar following a smooth path through the given points. */
export function Tube({ points, radius, c, segments = 24 }: { points: V3[]; radius: number; c: string; segments?: number }) {
  const geometry = cached(`u${points.join()}:${radius}:${segments}`, () => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.2);
    return new THREE.TubeGeometry(curve, segments, radius, 10);
  });
  return <mesh geometry={geometry} material={mat(c)} userData={MERGE} />;
}

/** A flat outline pushed into depth, with a small bevel on its edges. */
export function Extruded({ id, p, shape, depth, c, bevel = 0.005 }: { id: string; p: V3; shape: () => THREE.Shape; depth: number; c: string; bevel?: number }) {
  const geometry = cached(`e${id}:${depth}:${bevel}`, () => {
    const extruded = new THREE.ExtrudeGeometry(shape(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
    extruded.translate(0, 0, -depth / 2);
    return extruded;
  });
  return <mesh geometry={geometry} material={mat(c)} position={p} userData={MERGE} />;
}

/** A one-off shape built by code, cached under its id. */
export function Shaped({ id, make, p, r, c }: { id: string; make: () => THREE.BufferGeometry; p: V3; r?: Euler3; c: string }) {
  const geometry = cached(`x${id}`, make);
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={r} userData={MERGE} />;
}

function furGeometry(seed: number, amount: number) {
  const base = new THREE.IcosahedronGeometry(1, FUR_DETAIL);
  base.deleteAttribute("uv");
  base.deleteAttribute("normal");
  const geometry = mergeVertices(base, 1e-4);
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).normalize();
    const broad = Math.sin(point.x * 6 + seed) * Math.sin(point.y * 7 + seed * 2) * Math.sin(point.z * 6.5 + seed * 3);
    const tuft = Math.sin(point.x * 23 + seed * 5) * Math.sin(point.y * 19 + seed) * Math.sin(point.z * 21 + seed * 2);
    point.multiplyScalar(1 + amount * (broad * 0.55 + tuft * 0.75));
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(position.count * 2), 2));
  return geometry;
}

/** A soft, tufted blob for fur and plush. */
export function Fuzzy({ p, s, c, r, seed = 1, amount = 0.14 }: { p: V3; s: V3; c: string; r?: Euler3; seed?: number; amount?: number }) {
  const geometry = cached(`f${seed}:${amount}`, () => furGeometry(seed, amount));
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={r} scale={s} userData={MERGE} />;
}

export interface TuftPatch {
  /** Center and radii of the ellipsoid the hair grows from. */
  c: V3;
  r: V3;
  count: number;
  length: number;
  width: number;
  /** Direction the hair is combed toward. */
  flow?: V3;
  /** How much the hair stands up: 0 lies flat on the body, 1 points straight out. */
  lift?: number;
  /** How messy the strands are. */
  jitter?: number;
}

function tuftGeometry(seed: number, patches: TuftPatch[]) {
  let value = Math.floor(seed * 9973) + 7;
  const random = () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
  const positions: number[] = [];
  const normals: number[] = [];
  const root = new THREE.Vector3();
  const out = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const face = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  for (const patch of patches) {
    const count = Math.round(patch.count * TUFT_SCALE);
    const width = patch.width / Math.sqrt(TUFT_SCALE);
    for (let n = 0; n < count; n++) {
      const z = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - z * z);
      out.set(ring * Math.cos(angle), z, ring * Math.sin(angle));
      root.set(patch.c[0] + out.x * patch.r[0], patch.c[1] + out.y * patch.r[1], patch.c[2] + out.z * patch.r[2]);
      out.set(out.x / patch.r[0], out.y / patch.r[1], out.z / patch.r[2]).normalize();
      // Comb along the surface, so hair lies on the body instead of poking out of it.
      edgeA.set(...(patch.flow ?? [0, -1, 0]));
      edgeA.addScaledVector(out, -edgeA.dot(out));
      if (edgeA.lengthSq() < 0.04) edgeA.set(Math.sign(out.x) || 1, -0.2, 0).addScaledVector(out, -out.x);
      edgeA.normalize();
      dir.copy(edgeA).addScaledVector(out, patch.lift ?? 0.4);
      dir.x += (random() - 0.5) * (patch.jitter ?? 0.24);
      dir.y += (random() - 0.5) * (patch.jitter ?? 0.24);
      dir.z += (random() - 0.5) * (patch.jitter ?? 0.24);
      dir.normalize();
      u.set(Math.abs(dir.y) > 0.9 ? 1 : 0, Math.abs(dir.y) > 0.9 ? 0 : 1, 0).cross(dir).normalize();
      v.copy(dir).cross(u).normalize();
      const size = width * (0.7 + random() * 0.6);
      const length = patch.length * (0.65 + random() * 0.7);
      tip.copy(root).addScaledVector(dir, length);
      corners[0].copy(root).addScaledVector(u, size);
      corners[1].copy(root).addScaledVector(v, size);
      corners[2].copy(root).addScaledVector(u, -size);
      corners[3].copy(root).addScaledVector(v, -size);
      for (let side = 0; side < 4; side++) {
        const a = corners[side];
        const b = corners[(side + 1) % 4];
        face.crossVectors(edgeA.subVectors(b, a), edgeB.subVectors(tip, a)).normalize().multiplyScalar(0.3).add(out).normalize();
        for (const vertex of [a, b, tip]) {
          positions.push(vertex.x, vertex.y, vertex.z);
          normals.push(face.x, face.y, face.z);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
  return geometry;
}

/** Hundreds of small strands of hair, built once and merged into a single mesh. */
export function Tufts({ id, seed, patches, c }: { id: string; seed: number; patches: TuftPatch[]; c: string }) {
  const geometry = cached(`h${id}`, () => tuftGeometry(seed, patches));
  return <mesh geometry={geometry} material={mat(c)} userData={MERGE} />;
}

function leafGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 10);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const across = position.getX(i);
    const along = position.getY(i) + 0.5;
    const width = Math.sin(Math.PI * Math.pow(along, 0.75)) * 0.5;
    position.setXYZ(i, across * 2 * width, along, Math.abs(across) * 0.3 * width - along * along * 0.28);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function Leaf({ p, r, size, c }: { p: V3; r: Euler3; size: number; c: string }) {
  const geometry = cached("leaf", leafGeometry);
  return <mesh geometry={geometry} material={mat(c)} position={p} rotation={r} scale={[size * 0.62, size, size]} userData={MERGE} />;
}

/** Rewrites UVs from world position, so wood grain keeps its scale on every piece. */
function projectUVs(geometry: THREE.BufferGeometry, tile: number) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    d.fromBufferAttribute(position, i + 2);
    normal.copy(b).sub(a).cross(d.sub(a));
    const nx = Math.abs(normal.x);
    const ny = Math.abs(normal.y);
    const nz = Math.abs(normal.z);
    for (let j = i; j < i + 3; j++) {
      const x = position.getX(j);
      const y = position.getY(j);
      const z = position.getZ(j);
      if (ny >= nx && ny >= nz) uv.setXY(j, x / tile, z / tile);
      else if (nz >= nx) uv.setXY(j, x / tile, y / tile);
      else uv.setXY(j, z / tile, y / tile);
    }
  }
}

/**
 * Collapses every static part inside it into one mesh per material.
 * The office is built from thousands of faces, and this keeps draw calls low on phones.
 */
export function Merged({ children, cast = true }: { children: ReactNode; cast?: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const root = ref.current!;
    root.updateWorldMatrix(true, true);
    const toLocal = root.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const sources: THREE.Mesh[] = [];

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.userData.merge) return;
      const part = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      const material = mesh.material as THREE.Material;
      part.applyMatrix4(mesh.matrixWorld);
      if (material.userData.tile) projectUVs(part, material.userData.tile);
      part.applyMatrix4(toLocal);
      for (const name of Object.keys(part.attributes)) {
        if (name !== "position" && name !== "normal" && name !== "uv") part.deleteAttribute(name);
      }
      buckets.set(material, [...(buckets.get(material) ?? []), part]);
      sources.push(mesh);
    });

    const merged = [...buckets].map(([material, parts]) => {
      const mesh = new THREE.Mesh(mergeGeometries(parts), material);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      mesh.raycast = () => undefined;
      parts.forEach((part) => part.dispose());
      root.add(mesh);
      return mesh;
    });
    sources.forEach((mesh) => (mesh.visible = false));

    return () => {
      merged.forEach((mesh) => {
        root.remove(mesh);
        mesh.geometry.dispose();
      });
      sources.forEach((mesh) => (mesh.visible = true));
    };
  }, [cast]);

  return <group ref={ref}>{children}</group>;
}
