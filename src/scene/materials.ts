import * as THREE from "three";
import { scaleFor } from "./quality";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Paint = (c: CanvasRenderingContext2D, w: number, h: number) => void;

function tiled(w: number, h: number, paint: Paint, repeat: [number, number] = [1, 1]) {
  const canvas = document.createElement("canvas");
  const scale = scaleFor(w, h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  // A CPU-backed canvas guarantees the whole painting is finished before it goes to the GPU.
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.scale(scale, scale);
  paint(context, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(...repeat);
  return texture;
}

function grain(c: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, bw: number, bh: number, dark: string, light: string, seed: number) {
  const random = seeded(seed);
  const count = Math.round(bh / 2.4);
  c.save();
  c.beginPath();
  c.rect(x, y, bw, bh);
  c.clip();
  for (let i = 0; i < count; i++) {
    const lineY = y + random() * bh;
    const wave = 1.5 + random() * 5;
    const phase = random() * 6;
    c.strokeStyle = random() > 0.42 ? dark : light;
    c.globalAlpha = 0.05 + random() * 0.2;
    c.lineWidth = 0.6 + random() * 1.5;
    c.beginPath();
    for (let px = x; px <= x + bw; px += 24) {
      const py = lineY + Math.sin(px / (w / 7) + phase) * wave + Math.sin(px / (h / 19) + phase * 2) * 0.8;
      if (px === x) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.restore();
}

const wood = (base: string, dark: string, light: string, seed: number): Paint => (c, w, h) => {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  grain(c, w, h, 0, 0, w, h, dark, light, seed);
};

/** A soft shadow painted into the floor: x, z, half width, half depth, strength. */
export type FloorShade = [number, number, number, number, number];

function floorBoards(width: number, depth: number, shades: FloorShade[]): Paint {
  return (c, w, h) => {
    const tones = ["#b98a5d", "#ad7f54", "#c29567", "#a77a50", "#b6875a", "#bd8f61"];
    const rows = Math.round(depth / 0.2);
    const rowH = h / rows;
    const perMeter = w / width;
    const random = seeded(21);
    c.fillStyle = "#6b4a31";
    c.fillRect(0, 0, w, h);
    for (let row = 0; row < rows; row++) {
      let x = -random() * perMeter * 1.4;
      while (x < w) {
        const plank = perMeter * (1.1 + random() * 1.3);
        c.globalAlpha = 1;
        c.fillStyle = tones[Math.floor(random() * tones.length)];
        c.fillRect(x + 1, row * rowH + 1, plank - 2, rowH - 2);
        grain(c, w, h, x + 1, row * rowH + 1, plank - 2, rowH - 2, "#5e3f27", "#e0bb8e", Math.floor(random() * 9999));
        c.globalAlpha = 1;
        x += plank;
      }
    }

    // Shadows live inside the floor texture, so no layer can fight with it for depth.
    const edge = (x0: number, y0: number, x1: number, y1: number, strength: number, rx: number, ry: number, rw: number, rh: number) => {
      const gradient = c.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, `rgba(25,15,8,${strength})`);
      gradient.addColorStop(0.4, `rgba(25,15,8,${strength * 0.32})`);
      gradient.addColorStop(1, "rgba(25,15,8,0)");
      c.fillStyle = gradient;
      c.fillRect(rx, ry, rw, rh);
    };
    const reach = perMeter * 0.7;
    edge(0, 0, 0, reach, 0.46, 0, 0, w, reach);
    edge(0, 0, reach, 0, 0.36, 0, 0, reach, h);
    edge(w, 0, w - reach, 0, 0.36, w - reach, 0, reach, h);

    const toX = (x: number) => ((x + width / 2) / width) * w;
    const toY = (z: number) => (z / depth) * h;
    shades.forEach(([x, z, halfW, halfD, strength]) => {
      c.save();
      c.translate(toX(x), toY(z));
      c.scale(halfW * perMeter, halfD * (h / depth));
      const gradient = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, `rgba(20,12,6,${strength})`);
      gradient.addColorStop(0.55, `rgba(20,12,6,${strength * 0.55})`);
      gradient.addColorStop(1, "rgba(20,12,6,0)");
      c.fillStyle = gradient;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    });
  };
}

const slats: Paint = (c, w, h) => {
  c.fillStyle = "#2b1c13";
  c.fillRect(0, 0, w, h);
  const count = 8;
  const slat = w / count;
  for (let i = 0; i < count; i++) {
    c.fillStyle = ["#6f4a30", "#664329", "#744e33", "#6a452c"][i % 4];
    c.fillRect(i * slat + 3, 0, slat - 6, h);
    c.save();
    c.translate(i * slat + slat, 0);
    c.rotate(Math.PI / 2);
    grain(c, h, slat, 0, 0, h, slat - 6, "#3a2415", "#94684a", 80 + i);
    c.restore();
    c.fillStyle = "rgba(255,255,255,.07)";
    c.fillRect(i * slat + 3, 0, 2, h);
  }
};

const weave = (base: string, line: string): Paint => (c, w, h) => {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = line;
  c.globalAlpha = 0.28;
  c.lineWidth = 1;
  for (let i = 0; i < w; i += 3) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, h);
    c.stroke();
  }
  for (let i = 0; i < h; i += 3) {
    c.beginPath();
    c.moveTo(0, i);
    c.lineTo(w, i);
    c.stroke();
  }
  c.globalAlpha = 1;
};

const plaster: Paint = (c, w, h) => {
  c.fillStyle = "#f7f7f5";
  c.fillRect(0, 0, w, h);
  const random = seeded(5);
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = random() > 0.5 ? "rgba(0,0,0,.022)" : "rgba(255,255,255,.04)";
    c.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 3);
  }
};

interface Spec {
  color?: string;
  roughness: number;
  metalness?: number;
  paint?: () => THREE.Texture;
  bump?: number;
  /** World units per texture tile, projected so grain never stretches. */
  tile?: number;
  side?: THREE.Side;
}

const SPECS: Record<string, Spec> = {
  oak: { roughness: 0.48, tile: 1.4, bump: 0.25, paint: () => tiled(1024, 512, wood("#c79b6c", "#7d5533", "#ecc99c", 3)) },
  walnut: { roughness: 0.46, tile: 1.2, bump: 0.25, paint: () => tiled(1024, 512, wood("#5d3b28", "#2c1a10", "#8b6146", 9)) },
  walnutDark: { roughness: 0.55, tile: 1.2, paint: () => tiled(1024, 512, wood("#3b261a", "#1c110a", "#5e4030", 12)) },
  felt: { roughness: 0.96, tile: 0.35, paint: () => tiled(256, 256, weave("#2c3039", "#50566a")) },
  fabric: { roughness: 0.92, tile: 0.3, bump: 0.4, paint: () => tiled(256, 256, weave("#39435f", "#6f7da3")) },
  fabricWarm: { roughness: 0.9, tile: 0.3, bump: 0.4, paint: () => tiled(256, 256, weave("#a84e33", "#d98a68")) },
  rug: { roughness: 1, tile: 0.25, bump: 0.5, paint: () => tiled(256, 256, weave("#2b3556", "#57648f")) },
  rugEdge: { roughness: 1, tile: 0.25, bump: 0.5, paint: () => tiled(256, 256, weave("#c9b48d", "#efe2c6")) },
  blackMetal: { color: "#191b21", roughness: 0.38, metalness: 0.75 },
  graphite: { color: "#2a2d35", roughness: 0.42, metalness: 0.55 },
  steel: { color: "#aab0ba", roughness: 0.28, metalness: 0.95 },
  aluminum: { color: "#c8ccd3", roughness: 0.34, metalness: 0.85 },
  brass: { color: "#c49a48", roughness: 0.26, metalness: 1 },
  gold: { color: "#eabb3c", roughness: 0.2, metalness: 1 },
  goldDark: { color: "#c8922a", roughness: 0.28, metalness: 1 },
  chrome: { color: "#dfe3e8", roughness: 0.12, metalness: 1 },
  plasticDark: { color: "#1f2128", roughness: 0.46 },
  plasticLight: { color: "#e5e7ec", roughness: 0.38 },
  keycap: { color: "#2b2e37", roughness: 0.5 },
  keycapLight: { color: "#d9dbe1", roughness: 0.48 },
  ceramic: { color: "#f1eee7", roughness: 0.22 },
  ceramicDark: { color: "#27324f", roughness: 0.2 },
  terracotta: { color: "#b7694a", roughness: 0.78 },
  soil: { color: "#2d2019", roughness: 1 },
  coffee: { color: "#2a170d", roughness: 0.16 },
  paper: { color: "#f5f4ef", roughness: 0.85 },
  white: { color: "#f6f7f9", roughness: 0.5 },
  trim: { color: "#f3f4f6", roughness: 0.42 },
  leaf: { color: "#2f7350", roughness: 0.42, side: THREE.DoubleSide },
  leafLight: { color: "#3f8c61", roughness: 0.42, side: THREE.DoubleSide },
  bark: { color: "#5b4332", roughness: 0.9 },
  rumoInk: { color: "#141b24", roughness: 0.32 },
  rumoTan: { color: "#b89b7a", roughness: 0.36, metalness: 0.4 },
  note: { color: "#e6c766", roughness: 0.8 },
  bill: { color: "#5da777", roughness: 0.75 },
  billDark: { color: "#3f8058", roughness: 0.75 },
  tank: { color: "#79d9bd", roughness: 0.16, metalness: 0.35 },
  pipe: { color: "#7384c4", roughness: 0.22, metalness: 0.75 },
  red: { color: "#c5452e", roughness: 0.42 },
  toyBlue: { color: "#2767d8", roughness: 0.34 },
  toyRed: { color: "#dc3a30", roughness: 0.34 },
  toyYellow: { color: "#f5bd2e", roughness: 0.36 },
  caseWhite: { color: "#f2f3f6", roughness: 0.32, metalness: 0.08 },
  caseInner: { color: "#20232b", roughness: 0.62, metalness: 0.2 },
  rubber: { color: "#17181d", roughness: 0.82 },
  titanium: { color: "#6f737c", roughness: 0.3, metalness: 0.95 },
  glassBlack: { color: "#07080c", roughness: 0.12, metalness: 0.2 },
  plushGray: { color: "#a9a7a6", roughness: 1 },
  plushPink: { color: "#e8a1a4", roughness: 0.82 },
  eyeBlack: { color: "#090909", roughness: 0.12 },
  spitz: { color: "#f7f5ef", roughness: 0.9 },
  spitzLight: { color: "#ffffff", roughness: 0.9 },
  spitzShade: { color: "#ded8cb", roughness: 0.94 },
  yorkBlue: { color: "#6c6f75", roughness: 0.55 },
  yorkSilver: { color: "#9b9ea4", roughness: 0.5 },
  yorkDark: { color: "#3c3e43", roughness: 0.55 },
  yorkTan: { color: "#c58b49", roughness: 0.58 },
  yorkGold: { color: "#e3b673", roughness: 0.55 },
  earPink: { color: "#e6b3a6", roughness: 0.8 },
  dogNose: { color: "#17120f", roughness: 0.24 },
  bedRust: { color: "#b95d3e", roughness: 0.95 },
  bedTeal: { color: "#3f7f7c", roughness: 0.95 },
  bedCream: { color: "#eadfca", roughness: 1 },
  anvil: { color: "#454b57", roughness: 0.3, metalness: 0.9 },
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(key: string) {
  let material = cache.get(key);
  if (material) return material;
  const spec = SPECS[key] ?? { color: key, roughness: 0.6 };
  const map = spec.paint?.();
  material = new THREE.MeshStandardMaterial({
    color: spec.color ?? "#ffffff",
    roughness: spec.roughness,
    metalness: spec.metalness ?? 0,
    map: map ?? null,
    side: spec.side ?? THREE.FrontSide,
    bumpMap: spec.bump && map ? map : null,
    bumpScale: spec.bump ?? 1,
  });
  if (spec.tile) material.userData.tile = spec.tile;
  cache.set(key, material);
  return material;
}

export const wallMaterial = new THREE.MeshStandardMaterial({ roughness: 0.92 });
export const sideWallMaterial = new THREE.MeshStandardMaterial({ roughness: 0.92 });

let wallsReady = false;
export function prepareWalls() {
  if (wallsReady) return;
  wallsReady = true;
  const back = tiled(512, 512, plaster, [4, 2]);
  wallMaterial.map = back;
  sideWallMaterial.map = back;
  wallMaterial.needsUpdate = sideWallMaterial.needsUpdate = true;
}

export function makeFloorMaterial(width: number, depth: number, shades: FloorShade[]) {
  const pixels = 2048;
  const map = tiled(pixels, Math.round((pixels * depth) / width), floorBoards(width, depth, shades));
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.5 });
}

export function makeSlatMaterial(width: number, height: number) {
  const map = tiled(512, 512, slats, [width / 0.72, height / 1.6]);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.5, bumpMap: map, bumpScale: 1.2 });
}

function alphaTexture(w: number, h: number, paint: Paint) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext("2d")!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let blob: THREE.Texture | null = null;
/** Soft round contact shadow, used where objects touch a surface. */
export function blobTexture() {
  blob ??= alphaTexture(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,.72)");
    g.addColorStop(0.48, "rgba(0,0,0,.38)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  return blob;
}

let glow: THREE.Texture | null = null;
/** A soft white spot, tinted by whichever material uses it. */
export function glowTexture() {
  glow ??= alphaTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,.9)");
    g.addColorStop(0.5, "rgba(255,255,255,.28)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  return glow;
}

let edge: THREE.Texture | null = null;
/** Darkens corners between surfaces, dark at the bottom of the texture. */
export function edgeTexture() {
  edge ??= alphaTexture(8, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "rgba(0,0,0,.42)");
    g.addColorStop(0.35, "rgba(0,0,0,.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  return edge;
}

/** Sunlight through the window panes, thrown onto the floor. */
export function makeSunPatch() {
  return alphaTexture(512, 512, (c, w, h) => {
    c.filter = "blur(10px)";
    c.fillStyle = "#fff";
    const gap = 16;
    const paneW = (w - 120 - gap) / 2;
    const paneH = (h - 120 - gap) / 2;
    [0, 1].forEach((col) =>
      [0, 1].forEach((row) => c.fillRect(60 + col * (paneW + gap), 60 + row * (paneH + gap), paneW, paneH)),
    );
  });
}

export function makeBasketball() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#d9692c";
  c.fillRect(0, 0, 1024, 512);
  const random = seeded(33);
  for (let i = 0; i < 26000; i++) {
    c.fillStyle = random() > 0.5 ? "rgba(90,35,10,.2)" : "rgba(255,190,130,.14)";
    c.fillRect(random() * 1024, random() * 512, 2, 2);
  }
  c.strokeStyle = "#1c120d";
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(0, 256);
  c.lineTo(1024, 256);
  [256, 768].forEach((x) => {
    c.moveTo(x, 0);
    c.lineTo(x, 512);
  });
  c.stroke();
  [0, 512].forEach((x) => {
    c.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const px = x + 130 * Math.sin((y / 512) * Math.PI);
      if (y === 0) c.moveTo(px, y);
      else c.lineTo(px, y);
    }
    c.stroke();
    c.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const px = x + 512 - 130 * Math.sin((y / 512) * Math.PI);
      if (y === 0) c.moveTo(px, y);
      else c.lineTo(px, y);
    }
    c.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 0.5, roughness: 0.62 });
}

export function makeTennisBall() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#d4e34a";
  c.fillRect(0, 0, 512, 256);
  const random = seeded(44);
  for (let i = 0; i < 16000; i++) {
    c.fillStyle = random() > 0.5 ? "rgba(255,255,190,.2)" : "rgba(110,125,20,.17)";
    c.fillRect(random() * 512, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  c.strokeStyle = "#fbfbf2";
  c.lineWidth = 7;
  [0, Math.PI].forEach((phase) => {
    c.beginPath();
    for (let x = 0; x <= 512; x += 4) {
      const y = 128 + Math.sin((x / 512) * Math.PI * 2 * 2 + phase) * 74;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 0.8, roughness: 0.95 });
}

/** A classic 32-panel ball: the faces of a truncated icosahedron projected onto the sphere. */
export function makeSoccerBall() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const pentagons: THREE.Vector3[] = [];
  [-1, 1].forEach((a) =>
    [-phi, phi].forEach((b) => {
      pentagons.push(new THREE.Vector3(0, a, b).normalize(), new THREE.Vector3(a, b, 0).normalize(), new THREE.Vector3(b, 0, a).normalize());
    }),
  );
  const hexagons: THREE.Vector3[] = [];
  for (let i = 0; i < pentagons.length; i++) {
    for (let j = i + 1; j < pentagons.length; j++) {
      for (let k = j + 1; k < pentagons.length; k++) {
        const close = (u: THREE.Vector3, v: THREE.Vector3) => u.dot(v) > 0.4;
        if (close(pentagons[i], pentagons[j]) && close(pentagons[j], pentagons[k]) && close(pentagons[i], pentagons[k])) {
          hexagons.push(new THREE.Vector3().add(pentagons[i]).add(pentagons[j]).add(pentagons[k]).normalize());
        }
      }
    }
  }
  const faces = [...pentagons.map((n) => ({ n, plane: 2.327, dark: true })), ...hexagons.map((n) => ({ n, plane: 2.267, dark: false }))];

  const width = 768;
  const height = 384;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  const image = c.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const polar = ((y + 0.5) / height) * Math.PI;
    for (let x = 0; x < width; x++) {
      const around = ((x + 0.5) / width) * Math.PI * 2;
      const dx = -Math.cos(around) * Math.sin(polar);
      const dy = Math.cos(polar);
      const dz = Math.sin(around) * Math.sin(polar);
      let best = -Infinity;
      let second = -Infinity;
      let dark = false;
      for (const face of faces) {
        const value = (dx * face.n.x + dy * face.n.y + dz * face.n.z) / face.plane;
        if (value > best) {
          second = best;
          best = value;
          dark = face.dark;
        } else if (value > second) {
          second = value;
        }
      }
      const seam = best - second < 0.0052;
      const tone = seam ? 62 : dark ? 26 : 242;
      const index = (y * width + x) * 4;
      image.data[index] = tone;
      image.data[index + 1] = tone;
      image.data[index + 2] = tone + (dark ? 4 : 0);
      image.data[index + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.38 });
}
