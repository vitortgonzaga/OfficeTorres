import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SpotId } from "../content/site";
import { sheetView } from "../ui/sheetView";
import { ballInput, lookMode } from "./ballInput";
import type { V3 } from "./parts";
import { updateLookLabels } from "./Spot";

const PANEL_BREAKPOINT = 860;
const PANEL_WIDTH = 480;
const WIDE_PANEL = 760;
const SHEET_RATIO = 0.6;
const BASE_FOV = 24;
/** On upright phones the camera stands inside the room and turns like a head. */
const LOOK = { x: 0, y: 1.72, z: 4.7, fov: 60, focusFov: 46, yaw: 0.8, pitch: 1.75 };

const HOME_LOOK = new THREE.Vector3(0, 1.92, 0.5);
/** The part of the office that must fit on a landscape screen. */
const FIT_WIDTH = 8.5;
const FIT_HEIGHT = 5.15;
/** On portrait screens the office fills the height and dragging pans across it. */
const PORTRAIT_HEIGHT = 6.1;
const PORTRAIT_PAN = 2.75;
const LIFT = 0.1;

/** `tilt` raises the camera, for objects lying on the desk. */
const VIEWS: Record<SpotId, { look: V3; distance: number; tilt?: number; keepWidth?: number }> = {
  about: { look: [1.45, 1.05, 0.72], distance: 3.1, tilt: 0.18 },
  cork: { look: [0.22, 2.78, 0], distance: 5.3 },
  diploma: { look: [1.76, 2.85, 0], distance: 3.3 },
  certification: { look: [2.78, 2.85, 0], distance: 3.3 },
  monitor: { look: [0.2, 1.36, 0.36], distance: 4.3, keepWidth: 1.72 },
  paper: { look: [3.62, 2.86, 0], distance: 2.3 },
  extras: { look: [3.05, 0.5, 0.8], distance: 3.6, tilt: 0.28 },
  stack: { look: [-1.34, 2.94, 0], distance: 4.7 },
  resume: { look: [-1.2, 0.84, 0.98], distance: 2.5, tilt: 0.55 },
  phone: { look: [-0.74, 1, 0.52], distance: 2, tilt: 0.12 },
  trophies: { look: [3.05, 1.38, 0.28], distance: 5.2 },
};

const panelFor = (spot: SpotId, width: number) => (spot === "monitor" ? Math.min(WIDE_PANEL, width * 0.62) : Math.min(PANEL_WIDTH, width * 0.5));

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

export function OfficeCamera({ focus, reduced }: { focus: SpotId | null; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  const drag = useRef({ x: 0, y: 0, active: false, lastX: 0, lastY: 0 });
  const look = useRef(HOME_LOOK.clone());
  const offset = useRef({ x: 0, y: 0 });
  const started = useRef(false);
  const goalPos = useRef(new THREE.Vector3());
  const goalLook = useRef(new THREE.Vector3());

  useEffect(() => invalidate(), [focus, size, invalidate]);

  useEffect(() => {
    sheetView.onChange = invalidate;
    return () => {
      sheetView.onChange = null;
    };
  }, [invalidate]);

  useEffect(() => {
    const element = gl.domElement;
    const state = drag.current;
    const down = (event: PointerEvent) => {
      if (focus) return;
      state.active = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    };
    const move = (event: PointerEvent) => {
      if (!state.active) return;
      if (ballInput.grabbing) {
        state.active = false;
        return;
      }
      state.x = clamp(state.x - (event.clientX - state.lastX) / 150, -1, 1);
      state.y = clamp(state.y + (event.clientY - state.lastY) / 420, -0.3, 0.3);
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      invalidate();
    };
    const up = () => (state.active = false);
    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, focus, invalidate]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const aspect = size.width / size.height;
    const wide = size.width >= PANEL_BREAKPOINT;
    const looking = aspect < 0.8 && !wide;
    lookMode.active = looking;
    const goalFov = looking ? (focus ? LOOK.focusFov : LOOK.fov) : BASE_FOV;
    const unit = 2 * Math.tan(THREE.MathUtils.degToRad(goalFov / 2));
    const pos = goalPos.current;
    const target = goalLook.current;

    if (focus) {
      const view = VIEWS[focus];
      const fit = wide ? 1 : clamp(0.95 / aspect, 1, 2);
      let distance = view.distance * fit;
      if (wide && view.keepWidth) {
        // The monitor panel is wider, so step back until the object fits in the free space.
        const free = size.width - panelFor(focus, size.width) - 24;
        distance = Math.max(distance, (view.keepWidth * size.height) / (unit * free));
      }
      if (looking) distance *= (2 * Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2))) / unit;
      target.set(...view.look);
      pos.set(target.x, target.y + distance * (LIFT + (view.tilt ?? 0)), target.z + distance);
    } else if (looking) {
      const yaw = drag.current.x * LOOK.yaw;
      const pitch = drag.current.y * LOOK.pitch;
      pos.set(LOOK.x, LOOK.y, LOOK.z);
      target.set(pos.x + Math.sin(yaw) * Math.cos(pitch) * 4, pos.y + Math.sin(pitch) * 4, pos.z - Math.cos(yaw) * Math.cos(pitch) * 4);
    } else if (aspect < 0.8) {
      const distance = PORTRAIT_HEIGHT / unit;
      target.copy(HOME_LOOK);
      target.x = clamp(drag.current.x * PORTRAIT_PAN, -PORTRAIT_PAN, PORTRAIT_PAN);
      pos.set(target.x, target.y + distance * LIFT + drag.current.y, target.z + distance);
    } else {
      const distance = Math.max(FIT_HEIGHT, FIT_WIDTH / aspect) / unit;
      target.copy(HOME_LOOK);
      pos.set(drag.current.x * 1.2, target.y + distance * LIFT + drag.current.y, target.z + distance);
    }

    if (!started.current) {
      started.current = true;
      camera.fov = goalFov;
      camera.position.copy(pos);
      if (!reduced) camera.position.z += looking ? 0.4 : 2.2;
      look.current.copy(target);
    }

    const speed = reduced ? 1000 : drag.current.active ? 14 : 3.8;
    camera.position.x = damp(camera.position.x, pos.x, speed, delta);
    camera.position.y = damp(camera.position.y, pos.y, speed, delta);
    camera.position.z = damp(camera.position.z, pos.z, speed, delta);
    look.current.x = damp(look.current.x, target.x, speed, delta);
    look.current.y = damp(look.current.y, target.y, speed, delta);
    look.current.z = damp(look.current.z, target.z, speed, delta);
    camera.lookAt(look.current);
    camera.fov = Math.abs(camera.fov - goalFov) < 0.02 ? goalFov : damp(camera.fov, goalFov, speed, delta);

    // Shift the projection so the focused object stays clear of the open panel.
    const goalX = focus && wide ? panelFor(focus, size.width) / 2 : 0;
    const goalY = focus && !wide ? (size.height * (looking ? sheetView.ratio : SHEET_RATIO)) / 2 : 0;
    offset.current.x = damp(offset.current.x, goalX, speed, delta);
    offset.current.y = damp(offset.current.y, goalY, speed, delta);
    // A tight depth range keeps surfaces that are close together from flickering.
    const range = camera.position.distanceTo(look.current);
    camera.near = looking ? 0.25 : Math.max(0.5, range * 0.42);
    camera.far = looking ? 40 : range + 14;
    camera.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);

    const moving =
      camera.position.distanceToSquared(pos) > 1e-5 ||
      look.current.distanceToSquared(target) > 1e-5 ||
      Math.abs(offset.current.x - goalX) + Math.abs(offset.current.y - goalY) > 0.1 ||
      camera.fov !== goalFov;
    camera.updateMatrixWorld();
    updateLookLabels(camera, looking && !focus);
    if (moving) invalidate();
  });

  return null;
}
