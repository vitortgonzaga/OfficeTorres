import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { SecretId, SpotId } from "../content/site";
import { ballIsBusy, type ScoreKind } from "./ballInput";
import type { V3 } from "./parts";
import { makeLabel } from "./textures";

export interface SceneApi {
  focus: SpotId | null;
  day: boolean;
  reduced: boolean;
  select: (spot: SpotId, slug?: string) => void;
  toggleDay: () => void;
  hover: (label: string | null) => void;
  secret: (id: SecretId, x: number, y: number) => void;
  score: (kind: ScoreKind, x: number, y: number) => void;
  labelOf: (key: string) => string;
}

export const SceneContext = createContext<SceneApi>(null!);
export const useSceneApi = () => useContext(SceneContext);

/** Taps that moved further than this were a drag of the camera, not a click. */
const TAP_TOLERANCE_PX = 8;
const LABEL_HEIGHT_PX = 27;

export function useTapHandlers(label: string, onTap: () => void) {
  const { hover } = useSceneApi();
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    handlers: {
      onClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta <= TAP_TOLERANCE_PX && !ballIsBusy()) onTap();
      },
      onPointerOver: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        if (event.pointerType !== "mouse" || ballIsBusy()) return;
        setHovered(true);
        hover(label);
        document.body.style.cursor = "pointer";
      },
      onPointerOut: () => {
        setHovered(false);
        hover(null);
        document.body.style.cursor = "";
      },
    },
  };
}

type Handlers = ReturnType<typeof useTapHandlers>["handlers"];

const LABEL_LAYER = 0;
const HIDDEN_LAYER = 31;
const liveLabels = new Set<THREE.Sprite>();
const labelPoint = new THREE.Vector3();

/** When looking around, only the label closest to the center of the view stays on. */
export function updateLookLabels(camera: THREE.Camera, looking: boolean) {
  let best: THREE.Sprite | null = null;
  let bestDistance = Infinity;
  if (looking) {
    liveLabels.forEach((sprite) => {
      sprite.getWorldPosition(labelPoint).project(camera);
      const distance = Math.hypot(labelPoint.x, labelPoint.y * 0.7);
      if (labelPoint.z < 1 && Math.abs(labelPoint.x) < 0.9 && Math.abs(labelPoint.y) < 0.86 && distance < bestDistance) {
        best = sprite;
        bestDistance = distance;
      }
    });
  }
  liveLabels.forEach((sprite) => sprite.layers.set(!looking || sprite === best ? LABEL_LAYER : HIDDEN_LAYER));
}

/** A label that keeps the same size on screen, so every object says what it opens. */
function Label({ text, position, hovered, handlers }: { text: string; position: V3; hovered: boolean; handlers: Handlers }) {
  const sprite = useRef<THREE.Sprite>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const height = useThree((state) => state.size.height);
  const { texture, aspect } = useMemo(() => makeLabel(text), [text]);
  const material = useMemo(
    () => new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, sizeAttenuation: false }),
    [texture],
  );

  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
    },
    [material, texture],
  );

  useLayoutEffect(() => {
    const current = sprite.current;
    if (!current) return;
    liveLabels.add(current);
    return () => void liveLabels.delete(current);
  }, []);

  useFrame(() => {
    if (!sprite.current) return;
    const unit = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const size = ((hovered ? LABEL_HEIGHT_PX * 1.12 : LABEL_HEIGHT_PX) / height) * unit;
    sprite.current.scale.set(size * aspect, size, 1);
  });

  return <sprite ref={sprite} position={position} material={material} renderOrder={20} {...handlers} />;
}

interface HotspotProps {
  label: string;
  onTap: () => void;
  labelAt: V3;
  hit: { p: V3; s: V3 };
  hideLabel?: boolean;
  children?: ReactNode;
}

export function Hotspot({ label, onTap, labelAt, hit, hideLabel, children }: HotspotProps) {
  const { focus } = useSceneApi();
  const { hovered, handlers } = useTapHandlers(label, onTap);
  return (
    <group>
      {children}
      <mesh position={hit.p} scale={hit.s} visible={false} {...handlers}>
        <boxGeometry />
      </mesh>
      {focus === null && !hideLabel && <Label text={label} position={labelAt} hovered={hovered} handlers={handlers} />}
    </group>
  );
}
