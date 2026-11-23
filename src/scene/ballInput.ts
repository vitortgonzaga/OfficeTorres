import type * as THREE from "three";
import { FEATURES } from "../features";

/** Shared between the balls, the chair, the camera and the clickable objects. */
export const ballInput = {
  /** A ball or the chair is being held, so the camera must not pan. */
  grabbing: false,
  /** When the last object was let go, so that release is not read as a click. */
  releasedAt: -Infinity,
};

const RELEASE_GUARD_MS = 140;

export const ballIsBusy = () => ballInput.grabbing || performance.now() - ballInput.releasedAt < RELEASE_GUARD_MS;

/** Where the rolling chair is, so the balls can bump into it. */
export const chairPose = { x: -2.0, z: 1.42, yaw: 1.25, moving: false };

/** Where the balls are, so the ticker text can step aside when one flies past it. */
export const liveBalls: Array<{ position: THREE.Vector3; radius: number }> = [];

/** True on phones held upright, where the visitor stands inside the room and looks around. */
export const lookMode = { active: false };

export type ScoreKind = "hoop" | "goal";

/** The dogs open their eyes for a moment when something moves near them. */
export const dogAlert = { until: 0 };
const DOG_AWAKE_MS = 2800;
let sleepTimer: ReturnType<typeof setTimeout> | undefined;

export function wakeDogs(invalidate: () => void) {
  if (!FEATURES.dogs) return;
  const now = performance.now();
  const wasAsleep = now >= dogAlert.until;
  dogAlert.until = now + DOG_AWAKE_MS;
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(invalidate, DOG_AWAKE_MS + 30);
  if (wasAsleep) invalidate();
}
