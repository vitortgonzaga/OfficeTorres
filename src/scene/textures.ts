import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { scaleFor } from "./quality";

const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';
const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function makeTexture(w: number, h: number, draw: Draw) {
  const scale = scaleFor(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  draw(context, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function useTexture(w: number, h: number, draw: Draw) {
  const texture = useMemo(() => makeTexture(w, h, draw), [w, h, draw]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function redraw(texture: THREE.CanvasTexture, draw: Draw) {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext("2d")!;
  const scale = context.getTransform().a;
  draw(context, canvas.width / scale, canvas.height / scale);
  texture.needsUpdate = true;
}

/** A pill label. Returns the texture and its width/height ratio. */
export function makeLabel(text: string) {
  const height = 64;
  const probe = document.createElement("canvas").getContext("2d")!;
  const font = `700 32px ${DISPLAY}`;
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width) + 48;
  const texture = makeTexture(width, height, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#17181c";
    c.beginPath();
    c.roundRect(1, 1, w - 2, h - 2, 20);
    c.fill();
    c.strokeStyle = "#ffc56b";
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#ffffff";
    c.font = font;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, w / 2, h / 2 + 2);
  });
  texture.anisotropy = 1;
  return { texture, aspect: width / height };
}

export const drawSkyDay: Draw = (c, w, h) => {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#3f9be8");
  sky.addColorStop(0.42, "#7cc3f3");
  sky.addColorStop(0.62, "#cdeaf9");
  sky.addColorStop(1, "#eaf7ee");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
};

const GITHUB_MARK =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

/** Where the three app icons sit on the 800x480 monitor texture. */
export const MONITOR_APPS = [
  { id: "terminal", x: 288 },
  { id: "github", x: 512 },
] as const;
export const MONITOR_APP_Y = 214;
const APP_SIZE = 164;

export function drawMonitorHome(labels: Record<string, string>): Draw {
  return (c, w, h) => {
    const wallpaper = c.createLinearGradient(0, 0, w, h);
    wallpaper.addColorStop(0, "#1a2340");
    wallpaper.addColorStop(0.55, "#243158");
    wallpaper.addColorStop(1, "#3a2f55");
    c.fillStyle = wallpaper;
    c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(w * 0.8, h * 0.1, 10, w * 0.8, h * 0.1, w * 0.62);
    glow.addColorStop(0, "rgba(255,160,90,.24)");
    glow.addColorStop(1, "rgba(255,160,90,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);

    c.fillStyle = "rgba(10,13,28,.62)";
    c.fillRect(0, 0, w, 42);
    ["#ff7a6b", "#ffc56b", "#8ef0d0"].forEach((color, i) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(26 + i * 24, 21, 7, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = "#d7dcf2";
    c.font = `500 20px ${MONO}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("vitor@office", w / 2, 22);

    MONITOR_APPS.forEach(({ id, x }) => {
      const left = x - APP_SIZE / 2;
      const top = MONITOR_APP_Y - APP_SIZE / 2;
      c.save();
      c.shadowColor = "rgba(0,0,0,.45)";
      c.shadowBlur = 22;
      c.shadowOffsetY = 9;
      c.fillStyle = id === "terminal" ? "#0d1016" : "#f4f5f8";
      c.beginPath();
      c.roundRect(left, top, APP_SIZE, APP_SIZE, 38);
      c.fill();
      c.restore();

      if (id === "terminal") {
        c.strokeStyle = "#8ef0d0";
        c.lineWidth = 13;
        c.lineCap = "round";
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(x - 46, MONITOR_APP_Y - 32);
        c.lineTo(x - 10, MONITOR_APP_Y);
        c.lineTo(x - 46, MONITOR_APP_Y + 32);
        c.stroke();
        c.strokeStyle = "#ffffff";
        c.beginPath();
        c.moveTo(x + 8, MONITOR_APP_Y + 36);
        c.lineTo(x + 48, MONITOR_APP_Y + 36);
        c.stroke();
      } else {
        c.save();
        c.translate(x - 56, MONITOR_APP_Y - 56);
        c.scale(7, 7);
        c.fillStyle = "#171a21";
        c.fill(new Path2D(GITHUB_MARK), "evenodd");
        c.restore();
      }
      c.fillStyle = "#ffffff";
      c.font = `700 31px ${DISPLAY}`;
      c.fillText(labels[id], x, MONITOR_APP_Y + APP_SIZE / 2 + 42);
    });
  };
}

/** A felt pennant with the main tools. Everything below the V is see-through. */
export function drawStackBanner(items: string[]): Draw {
  return (c, w, h) => {
    const tip = h * 0.86;
    const outline = (inset: number) => {
      c.beginPath();
      c.moveTo(inset, inset);
      c.lineTo(w - inset, inset);
      c.lineTo(w - inset, tip - inset * 0.5);
      c.lineTo(w / 2, h - inset * 1.5);
      c.lineTo(inset, tip - inset * 0.5);
      c.closePath();
    };
    outline(0);
    const cloth = c.createLinearGradient(0, 0, w, h);
    cloth.addColorStop(0, "#172238");
    cloth.addColorStop(1, "#232f4b");
    c.fillStyle = cloth;
    c.fill();
    outline(18);
    c.strokeStyle = "#ff9d2a";
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = "#101a2d";
    c.fillRect(18, 18, w - 36, 104);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#ff9d2a";
    c.font = `800 74px ${DISPLAY}`;
    c.fillText("STACK", w / 2, 74);
    c.fillStyle = "#ffffff";
    c.font = `700 45px ${DISPLAY}`;
    const top = 178;
    const step = 69;
    items.forEach((item, i) => c.fillText(item, w / 2, top + i * step));
  };
}

export const drawCork: Draw = (c, w, h) => {
  c.fillStyle = "#c39160";
  c.fillRect(0, 0, w, h);
  const noise = (n: number) => {
    const value = Math.sin(n * 127.1) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let i = 0; i < 5200; i++) {
    c.fillStyle = noise(i) > 0.55 ? "rgba(90,52,28,.22)" : "rgba(240,205,160,.22)";
    c.fillRect(noise(i + 0.3) * w, noise(i + 0.7) * h, 1.5 + noise(i + 0.1) * 3.5, 1.5 + noise(i + 0.9) * 2.5);
  }
  const cards: Array<{ name: string; place: string; date: string; tags: string; color: string; angle: number }> = [
    { name: "eHealth", place: "Inatel", date: "2023 – 2025", tags: "Python · OpenCV · Flutter", color: "#14306e", angle: -0.018 },
    { name: "Multittech", place: "Engenharia", date: "2025 – 2026", tags: "Python · AWS · ETL", color: "#ee7a16", angle: 0.012 },
    { name: "LEVTY", place: "SYDLE ONE", date: "2026 →", tags: "APIs · CRM · Elasticsearch", color: "#2aa9e8", angle: -0.01 },
  ];
  const cardW = 440;
  const cardH = 500;
  const gap = (w - cardW * 3) / 4;
  const top = (h - cardH) / 2;
  const pinY = top + 6;
  const pinX = cards.map((_, i) => gap + i * (cardW + gap) + cardW / 2);

  cards.forEach((card, i) => {
    const x = gap + i * (cardW + gap);
    c.save();
    c.translate(x + cardW / 2, top + cardH / 2);
    c.rotate(card.angle);
    c.translate(-cardW / 2, -cardH / 2);
    c.fillStyle = "rgba(45,24,10,.34)";
    c.fillRect(7, 10, cardW, cardH);
    c.fillStyle = "#fcfbf6";
    c.fillRect(0, 0, cardW, cardH);
    c.fillStyle = card.color;
    c.fillRect(0, 0, cardW, 22);
    c.fillStyle = "#1b2240";
    c.font = `800 74px ${DISPLAY}`;
    c.fillText(card.name, 30, 138, cardW - 56);
    c.fillStyle = "#59617f";
    c.font = `500 38px ${DISPLAY}`;
    c.fillText(card.place, 30, 196, cardW - 56);
    c.fillStyle = card.color;
    c.font = `700 52px ${MONO}`;
    c.fillText(card.date, 30, 318, cardW - 56);
    c.fillStyle = "#d8dbe6";
    c.fillRect(30, 366, cardW - 60, 3);
    c.fillStyle = "#333b5c";
    c.font = `500 31px ${MONO}`;
    c.fillText(card.tags, 30, 428, cardW - 56);
    c.restore();
  });

  c.strokeStyle = "#c22d2d";
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(pinX[0], pinY);
  c.quadraticCurveTo((pinX[0] + pinX[1]) / 2, pinY + 42, pinX[1], pinY);
  c.quadraticCurveTo((pinX[1] + pinX[2]) / 2, pinY + 42, pinX[2], pinY);
  c.stroke();
  pinX.forEach((x) => {
    c.fillStyle = "rgba(40,20,10,.4)";
    c.beginPath();
    c.arc(x + 4, pinY + 6, 17, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d8352f";
    c.beginPath();
    c.arc(x, pinY, 17, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.65)";
    c.beginPath();
    c.arc(x - 5, pinY - 6, 5, 0, Math.PI * 2);
    c.fill();
  });
};

export const drawDiploma: Draw = (c, w, h) => {
  c.fillStyle = "#f6f3e6";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#27305c";
  c.lineWidth = 4;
  c.strokeRect(16, 16, w - 32, h - 32);
  c.textAlign = "center";
  c.fillStyle = "#27305c";
  c.font = `800 74px ${DISPLAY}`;
  c.fillText("INATEL", w / 2, 116);
  c.font = `500 34px ${DISPLAY}`;
  c.fillText("Engenharia de Software", w / 2, 182);
  c.font = `700 36px ${DISPLAY}`;
  c.fillText("Vitor Gonzaga", w / 2, 248);
  c.font = `500 24px ${MONO}`;
  c.fillText("2022 — 2027", w / 2, 300);
};

export const drawCertificate: Draw = (c, w, h) => {
  const background = c.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#172238");
  background.addColorStop(1, "#232f4b");
  c.fillStyle = background;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#ff9d2a";
  c.lineWidth = 4;
  c.strokeRect(18, 18, w - 36, h - 36);
  c.textAlign = "center";
  c.fillStyle = "#ff9d2a";
  c.font = `800 74px ${DISPLAY}`;
  c.fillText("AWS", w / 2, 112);
  c.fillStyle = "#ffffff";
  c.font = `500 28px ${DISPLAY}`;
  c.fillText("Certified", w / 2, 158);
  c.font = `800 46px ${DISPLAY}`;
  c.fillText("AI Practitioner", w / 2, 224);
  c.fillStyle = "#c7cfe4";
  c.font = `500 28px ${DISPLAY}`;
  c.fillText("Vitor Gonzaga", w / 2, 292);
  c.font = `500 20px ${MONO}`;
  c.fillText("2026", w / 2, 338);
};

export const drawPaper: Draw = (c, w, h) => {
  c.fillStyle = "#fbfbf6";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#27305c";
  c.textAlign = "center";
  c.font = `800 32px ${DISPLAY}`;
  ["Interface Acessível", "para pessoas com ELA"].forEach((line, i) => c.fillText(line, w / 2, 62 + i * 38));
  c.font = `500 20px ${MONO}`;
  c.fillStyle = "#d9593d";
  c.fillText("INCITEL 2025", w / 2, 150);
  const columns = [34, w / 2 + 8];
  const columnW = w / 2 - 42;
  columns.forEach((x, column) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = "#a9b0d6";
      c.fillRect(x, 186 + i * 19, columnW * (0.76 + ((i + column) % 4) * 0.08), 6);
    }
  });
  c.strokeStyle = "#27305c";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(columns[1] + columnW / 2, 306, 25, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#27305c";
  c.beginPath();
  c.arc(columns[1] + columnW / 2, 306, 9, 0, Math.PI * 2);
  c.fill();
};

export const drawTicker: Draw = (c, w, h) => {
  c.fillStyle = "#090d24";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffbf4d";
  c.font = `600 ${h * 0.56}px ${MONO}`;
  c.textBaseline = "middle";
  const items = ["IBOV", "S&P 500", "SELIC", "IPCA", "USD/BRL", "NASDAQ", "CDI", "FIIs"];
  const step = w / items.length;
  items.forEach((item, i) => {
    c.fillStyle = i % 2 ? "#8ef0d0" : "#ffbf4d";
    c.fillText(item, i * step + 18, h / 2 + 2);
    c.fillStyle = "#47507f";
    c.fillText("·", i * step + step - 18, h / 2 + 2);
  });
};

export function drawPhone(photo?: HTMLImageElement | null): Draw {
  return (c, w, h) => {
    const wallpaper = c.createLinearGradient(0, 0, w, h);
    wallpaper.addColorStop(0, "#26376f");
    wallpaper.addColorStop(0.55, "#17204a");
    wallpaper.addColorStop(1, "#0d1230");
    c.fillStyle = wallpaper;
    c.fillRect(0, 0, w, h);

    const middle = w / 2;
    const avatarY = 250;
    const avatarR = 112;
    c.save();
    c.beginPath();
    c.arc(middle, avatarY, avatarR, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = "#535356";
    c.fillRect(middle - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    if (photo) c.drawImage(photo, middle - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.85)";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(middle, avatarY, avatarR, 0, Math.PI * 2);
    c.stroke();

    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#ffffff";
    c.font = `700 46px ${DISPLAY}`;
    c.fillText("Vitor Gonzaga", middle, 438, w - 40);
    c.fillStyle = "#b9c2f2";
    c.font = `500 26px ${DISPLAY}`;
    c.fillText("Backend & Data", middle, 482);

    const actions: Array<{ text: string; color: string }> = [
      { text: "@", color: "#3f7bf0" },
      { text: "in", color: "#2a78b8" },
      { text: "</>", color: "#3a3f52" },
    ];
    const size = 66;
    const spacing = 22;
    const start = (w - size * actions.length - spacing * (actions.length - 1)) / 2;
    actions.forEach((action, i) => {
      const x = start + i * (size + spacing);
      c.fillStyle = action.color;
      c.beginPath();
      c.roundRect(x, 556, size, size, 18);
      c.fill();
      c.fillStyle = "#ffffff";
      c.textBaseline = "middle";
      c.font = `700 ${action.text.length > 2 ? 22 : 30}px ${MONO}`;
      c.fillText(action.text, x + size / 2, 556 + size / 2 + 2);
    });

    c.textBaseline = "alphabetic";
    c.fillStyle = "#3ccf8e";
    c.beginPath();
    c.roundRect(48, 668, w - 96, 62, 31);
    c.fill();
    c.fillStyle = "#07301d";
    c.font = `700 25px ${MONO}`;
    c.fillText("@vitortgonzaga", middle, 708);
  };
}

export const drawRainbowRing: Draw = (c, w, h) => {
  const gradient = c.createConicGradient(0, w / 2, h / 2);
  ["#ff2d55", "#ff9500", "#ffe600", "#22e58a", "#19c8ff", "#5f5bff", "#e13bff", "#ff2d55"].forEach((color, i, list) =>
    gradient.addColorStop(i / (list.length - 1), color),
  );
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
};

export const drawRainbowStrip: Draw = (c, w, h) => {
  const gradient = c.createLinearGradient(0, 0, 0, h);
  ["#ff2d55", "#ff9500", "#ffe600", "#22e58a", "#19c8ff", "#5f5bff", "#e13bff", "#ff2d55"].forEach((color, i, list) =>
    gradient.addColorStop(i / (list.length - 1), color),
  );
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
};

export const drawResume: Draw = (c, w, h) => {
  c.fillStyle = "#fbfbf6";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#27305c";
  c.font = `800 34px ${DISPLAY}`;
  c.fillText("Vitor Gonzaga", 26, 54);
  c.fillStyle = "#d9593d";
  c.fillRect(26, 70, 92, 5);
  const widths = [0.86, 0.74, 0.8, 0, 0.5, 0.88, 0.8, 0.84, 0.66, 0, 0.42, 0.86, 0.78, 0.82];
  widths.forEach((width, i) => {
    if (!width) return;
    c.fillStyle = width < 0.55 ? "#27305c" : "#a9b0d6";
    c.fillRect(26, 102 + i * 24, (w - 52) * width, width < 0.55 ? 10 : 7);
  });
};

/** The hidden sticky note, written with a marker. */
export const drawHiddenNote: Draw = (c, w, h) => {
  const paper = c.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, "#fff07e");
  paper.addColorStop(0.65, "#ffe14f");
  paper.addColorStop(1, "#efc52f");
  c.fillStyle = paper;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(120, 85, 0, .13)";
  c.fillRect(0, 0, w, h * 0.13);
  c.save();
  c.translate(w / 2, h / 2 + 8);
  c.rotate(-0.05);
  // Unreadable on purpose: the message only appears when the note is opened.
  c.strokeStyle = "#1d1a14";
  c.lineWidth = 9;
  c.lineCap = "round";
  c.lineJoin = "round";
  [-74, 0, 74].forEach((y, row) => {
    const half = [118, 132, 92][row];
    c.beginPath();
    c.moveTo(-half, y);
    for (let x = -half; x <= half; x += 7) {
      const wave = Math.sin(x * 0.17 + row * 2) * 17 + Math.sin(x * 0.071 + row) * 9;
      c.lineTo(x, y + wave);
    }
    c.stroke();
  });
  c.restore();
};
