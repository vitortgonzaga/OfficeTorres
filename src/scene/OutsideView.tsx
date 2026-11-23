import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { drawSkyDay, useTexture } from "./textures";

const SKY = { x: -4.6, y: 3.2, z: -12.8, w: 30, h: 15 };
const HAZE = new THREE.Color("#cfe6f5");
const SUN_DIRECTION = new THREE.Vector3(-5.5, 8, 9).normalize();
const GREENS = ["#3f8f55", "#4c9c5c", "#2f7a4b", "#5aa862"];

function groundHeight(x: number, z: number) {
  const far = THREE.MathUtils.clamp(-z / 12, 0, 1);
  return -1.2 + 1.9 * far + 0.28 * Math.sin(x * 0.62 + 1) * far + 0.18 * Math.sin(x * 1.3 + z * 0.5) * far + 0.12 * Math.sin(z * 0.9 + x * 0.4);
}

/** Every outdoor shape goes into one faceted mesh, so the whole view is a single draw call. */
function buildScenery() {
  let seed = 77;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const parts: THREE.BufferGeometry[] = [];
  const shade = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();

  const add = (source: THREE.BufferGeometry, color: string, p: [number, number, number], s: [number, number, number], yaw = 0, haze = true) => {
    const part = source.index ? source.toNonIndexed() : source.clone();
    quaternion.setFromEuler(euler.set(0, yaw, 0));
    part.applyMatrix4(matrix.compose(new THREE.Vector3(...p), quaternion, new THREE.Vector3(...s)));
    part.deleteAttribute("uv");
    part.computeVertexNormals();
    shade.set(color);
    if (haze) shade.lerp(HAZE, THREE.MathUtils.clamp(-p[2] / 14, 0, 1) * 0.2);
    const colors = new Float32Array(part.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([shade.r, shade.g, shade.b], i);
    part.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(part);
  };

  const blob = new THREE.IcosahedronGeometry(1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const roof = new THREE.ConeGeometry(1, 1, 4);

  const ground = new THREE.PlaneGeometry(24, 15, 56, 34);
  ground.rotateX(-Math.PI / 2);
  ground.translate(-5, 0, -6.5);
  const position = ground.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, groundHeight(position.getX(i), position.getZ(i)));
  const flatGround = ground.toNonIndexed();
  flatGround.deleteAttribute("uv");
  flatGround.computeVertexNormals();
  const groundColors = new Float32Array(flatGround.attributes.position.count * 3);
  const groundPosition = flatGround.attributes.position;
  for (let i = 0; i < groundPosition.count; i += 3) {
    shade.set(random() > 0.5 ? "#67b56b" : "#5dab64").lerp(HAZE, THREE.MathUtils.clamp(-groundPosition.getZ(i) / 14, 0, 1) * 0.18);
    for (let v = 0; v < 3; v++) groundColors.set([shade.r, shade.g, shade.b], (i + v) * 3);
  }
  flatGround.setAttribute("color", new THREE.BufferAttribute(groundColors, 3));
  parts.push(flatGround);

  const tree = (x: number, z: number, size: number) => {
    const y = groundHeight(x, z);
    const green = GREENS[Math.floor(random() * GREENS.length)];
    add(trunk, "#6b4b35", [x, y + size * 0.3, z], [size * 0.09, size * 0.62, size * 0.09]);
    if (random() > 0.45) {
      add(blob, green, [x, y + size * 0.86, z], [size * 0.46, size * 0.52, size * 0.46], random() * 3);
      add(blob, GREENS[Math.floor(random() * GREENS.length)], [x + size * 0.24, y + size * 0.68, z + size * 0.1], [size * 0.3, size * 0.3, size * 0.3], random() * 3);
      add(blob, green, [x - size * 0.25, y + size * 0.66, z + size * 0.06], [size * 0.28, size * 0.28, size * 0.28], random() * 3);
    } else {
      add(cone, "#2c6e49", [x, y + size * 0.62, z], [size * 0.42, size * 0.72, size * 0.42], random() * 3);
      add(cone, green, [x, y + size * 1.0, z], [size * 0.31, size * 0.6, size * 0.31], random() * 3);
    }
  };

  for (let i = 0; i < 38; i++) tree(-11 + random() * 13.5, -7 - random() * 5, 0.5 + random() * 0.55);
  [[-6.05, -7.7, 1.2], [-3.68, -7.9, 1.12], [-2.2, -7.4, 1.2], [-1.05, -7.8, 1.1]].forEach(([x, z, size]) => tree(x, z, size));

  [[-6.5, -10.2, 0], [-5.1, -11, 0.5], [-3.2, -10.6, -0.4], [-1.9, -11.2, 0.3]].forEach(([x, z, yaw], i) => {
    const y = groundHeight(x, z);
    add(box, i % 2 ? "#f3ead9" : "#fbf6ec", [x, y + 0.16, z], [0.52, 0.34, 0.42], yaw);
    add(roof, i % 2 ? "#a9503a" : "#c0603f", [x, y + 0.45, z], [0.46, 0.26, 0.4], yaw + Math.PI / 4);
    add(box, "#37445c", [x, y + 0.13, z + 0.215], [0.11, 0.2, 0.01], yaw);
  });

  [[-6.6, 2.55, 0.8], [-4.65, 3.1, 0.62], [-3.35, 2.25, 0.7], [-1.7, 2.9, 0.75]].forEach(([x, y, size]) => {
    const z = -11.9;
    add(blob, "#ffffff", [x, y, z], [size * 0.72, size * 0.3, 0.26], 0, false);
    add(blob, "#ffffff", [x - size * 0.42, y - 0.03, z + 0.05], [size * 0.42, size * 0.22, 0.22], 0, false);
    add(blob, "#f3f7fb", [x + size * 0.46, y - 0.04, z + 0.05], [size * 0.44, size * 0.2, 0.22], 0, false);
    add(blob, "#ffffff", [x + size * 0.04, y + size * 0.16, z + 0.08], [size * 0.36, size * 0.26, 0.2], 0, false);
  });

  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());

  // Sunlight is painted into the colors, so the view stays daytime whatever the room's lights do.
  const normals = merged.attributes.normal;
  const colors = merged.attributes.color;
  const normal = new THREE.Vector3();
  for (let i = 0; i < normals.count; i++) {
    const light = 0.74 + 0.4 * Math.max(normal.fromBufferAttribute(normals, i).dot(SUN_DIRECTION), 0);
    colors.setXYZ(i, Math.min(colors.getX(i) * light, 1), Math.min(colors.getY(i) * light, 1), Math.min(colors.getZ(i) * light, 1));
  }
  return merged;
}

/** Hills, trees, houses and clouds behind the window, always in daylight. */
export function OutsideView() {
  const sky = useTexture(256, 512, drawSkyDay);
  const scenery = useMemo(buildScenery, []);
  useEffect(() => () => scenery.dispose(), [scenery]);

  return (
    <group>
      <mesh position={[SKY.x, SKY.y, SKY.z]} raycast={() => undefined}>
        <planeGeometry args={[SKY.w, SKY.h]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      <mesh position={[-5.25, 3.02, SKY.z + 0.03]} raycast={() => undefined}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color="#fff2b8" toneMapped={false} />
      </mesh>
      <mesh geometry={scenery} raycast={() => undefined}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
    </group>
  );
}
