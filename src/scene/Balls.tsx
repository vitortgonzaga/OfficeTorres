import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ballInput, chairPose, liveBalls, wakeDogs, type ScoreKind } from "./ballInput";
import { blobTexture, makeBasketball, makeSoccerBall, makeTennisBall } from "./materials";
import type { V3 } from "./parts";
import { BALL_SEGMENTS } from "./quality";
import { useSceneApi } from "./Spot";

/** Where the kids' hoop stands, shared with its model. */
export const HOOP = { x: -3.5, z: 0.52, yaw: 0.38, rimY: 1, rimZ: 0.33, rimRadius: 0.235 };

/** The little soccer goal flat against the left wall, shared with its model. */
export const GOAL = { x: -3.66, z: 1.42, yaw: Math.PI / 2, width: 0.82, height: 0.5, depth: 0.3 };

const GRAVITY = 9.8;
const STEP = 1 / 120;
const MAX_FRAME = 0.05;
const MAX_SPEED = 11;
const HOLD_STRENGTH = 20;
const ROLL_DRAG = 0.8;
const REST_SPEED = 0.05;
const REST_BOUNCE = 0.2;
const AIR_DRAG = 0.1;

const SCORE_COOLDOWN_MS = 1200;
/** How far from the rim a throw can land and still get a helping hand. */
const AIM_REACH = 0.6;
const AIM_FULL = 0.28;
const AIM_MIN_SPEED = 1.2;
/** A ball coming down over the rim is gently guided to its center. */
const FUNNEL = { radius: 0.44, height: 0.55, pull: 42, drag: 5 };

const ROOM = { minX: -4, maxX: 4, minZ: 0.07, maxZ: 3.1, maxY: 4 };

interface Box {
  min: V3;
  max: V3;
}

interface ColliderGroup {
  x: number;
  z: number;
  yaw: number;
  boxes: Box[];
}

const box = (min: V3, max: V3): Box => ({ min, max });

const OFFICE: ColliderGroup = {
  x: 0,
  z: 0,
  yaw: 0,
  boxes: [
    box([-2.05, 0, 1.55], [2.35, 0.032, 2.85]), // rug
    // Solid from the floor to the desk top, so balls never roll under it or behind it.
    box([-1.64, 0, 0], [2.08, 0.79, 1.26]),
    box([2.08, 0, 0], [2.25, 0.79, 0.6]),
    box([-0.56, 0.93, 0.34], [0.96, 1.85, 0.41]), // monitor
    box([0.14, 0.79, 0.3], [0.26, 0.95, 0.36]),
    box([-0.3, 0.79, 0.83], [0.46, 0.84, 1.11]), // keyboard
    box([1.07, 0.79, 0.65], [1.83, 0.825, 1.15]), // laptop
    box([1.07, 0.81, 0.56], [1.83, 1.29, 0.68]),
    box([1.55, 1.33, 0.52], [1.9, 1.52, 0.86]), // lamp
    box([-0.84, 0.79, 0.4], [-0.64, 1.16, 0.6]), // phone
    box([-1.34, 0.79, 0.35], [-1.16, 1.04, 0.53]), // soda glass
    box([-0.5, 0.79, 0.41], [-0.19, 0.915, 0.71]), // Mac mini
    box([2.25, 0, 0], [3.85, 2.06, 0.6]), // trophy shelf
    box([3.46, 2.06, 0.18], [3.74, 2.3, 0.46]), // small plant
    box([-3.93, 1.2, 0], [-2.07, 1.27, 0.19]), // window sill
    // The racket leaning on the wall, in three steps that follow its slope.
    box([-3, 0, 0.05], [-2.88, 0.4, 0.35]),
    box([-3.2, 0.38, 0.05], [-2.76, 0.72, 0.26]),
    box([-3.2, 0.72, 0.05], [-2.76, 1.1, 0.16]),
  ],
};

const CHAIR: ColliderGroup = {
  x: chairPose.x,
  z: chairPose.z,
  yaw: chairPose.yaw,
  boxes: [
    box([-0.38, 0, -0.38], [0.38, 0.11, 0.38]),
    box([-0.06, 0, -0.06], [0.06, 0.46, 0.06]),
    box([-0.31, 0.44, -0.28], [0.31, 0.58, 0.32]),
    box([-0.29, 0.7, -0.42], [0.29, 1.46, -0.3]),
  ],
};

const HOOP_COLLIDERS: ColliderGroup = {
  x: HOOP.x,
  z: HOOP.z,
  yaw: HOOP.yaw,
  boxes: [
    box([-0.3, 0, -0.32], [0.3, 0.13, 0.31]),
    box([-0.03, 0, -0.07], [0.03, 1.12, -0.01]),
    box([-0.31, 0.92, 0.035], [0.31, 1.34, 0.08]),
  ],
};

const halfGoal = GOAL.width / 2;
const GOAL_COLLIDERS: ColliderGroup = {
  x: GOAL.x,
  z: GOAL.z,
  yaw: GOAL.yaw,
  boxes: [
    box([-halfGoal - 0.02, 0, -0.02], [-halfGoal + 0.02, GOAL.height, 0.02]),
    box([halfGoal - 0.02, 0, -0.02], [halfGoal + 0.02, GOAL.height, 0.02]),
    box([-halfGoal, GOAL.height - 0.02, -0.02], [halfGoal, GOAL.height + 0.02, 0.02]),
    box([-halfGoal, 0, -GOAL.depth - 0.02], [halfGoal, GOAL.height * 0.6, -GOAL.depth + 0.01]),
    box([-halfGoal, GOAL.height * 0.55, -GOAL.depth * 0.75], [halfGoal, GOAL.height, -GOAL.depth * 0.55]),
    box([-halfGoal - 0.02, 0, -GOAL.depth], [-halfGoal + 0.01, GOAL.height, 0]),
    box([halfGoal - 0.01, 0, -GOAL.depth], [halfGoal + 0.02, GOAL.height, 0]),
    box([-halfGoal, GOAL.height - 0.01, -GOAL.depth * 0.6], [halfGoal, GOAL.height + 0.02, 0]),
  ],
};

const GROUPS = [OFFICE, CHAIR, HOOP_COLLIDERS, GOAL_COLLIDERS];

interface BallConfig {
  id: string;
  radius: number;
  bounce: number;
  start: V3;
  hit: number;
}

const BALLS: BallConfig[] = [
  { id: "basketball", radius: 0.135, bounce: 0.78, start: [-2.98, 0.135, 1.05], hit: 0.17 },
  { id: "soccer", radius: 0.125, bounce: 0.68, start: [-3.14, 0.125, 1.62], hit: 0.16 },
  { id: "tennis", radius: 0.055, bounce: 0.72, start: [-2.63, 0.055, 0.46], hit: 0.12 },
];

interface BallState extends BallConfig {
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Quaternion;
  grounded: boolean;
  asleep: boolean;
  inGoal: boolean;
  scoredAt: number;
}

const normal = new THREE.Vector3();
const scratch = new THREE.Vector3();
const closest = new THREE.Vector3();
const local = new THREE.Vector3();
const localVelocity = new THREE.Vector3();
const delta = new THREE.Vector3();
const axis = new THREE.Vector3();
const turn = new THREE.Quaternion();

function bounceOff(ball: BallState, position: THREE.Vector3, velocity: THREE.Vector3, n: THREE.Vector3, overlap: number, floorLike: boolean) {
  position.addScaledVector(n, overlap);
  const into = velocity.dot(n);
  if (into >= 0) {
    if (floorLike) ball.grounded = true;
    return;
  }
  let rebound = -into * ball.bounce;
  if (floorLike && rebound < REST_BOUNCE) rebound = 0;
  scratch.copy(velocity).addScaledVector(n, -into).multiplyScalar(floorLike ? 0.992 : 0.9);
  velocity.copy(scratch).addScaledVector(n, rebound);
  if (floorLike) ball.grounded = true;
}

function collideBox(ball: BallState, position: THREE.Vector3, velocity: THREE.Vector3, target: Box) {
  const { min, max } = target;
  closest.set(
    THREE.MathUtils.clamp(position.x, min[0], max[0]),
    THREE.MathUtils.clamp(position.y, min[1], max[1]),
    THREE.MathUtils.clamp(position.z, min[2], max[2]),
  );
  normal.copy(position).sub(closest);
  const distanceSq = normal.lengthSq();
  if (distanceSq >= ball.radius * ball.radius) return;
  if (distanceSq > 1e-9) {
    const distance = Math.sqrt(distanceSq);
    normal.divideScalar(distance);
    bounceOff(ball, position, velocity, normal, ball.radius - distance, normal.y > 0.6);
    return;
  }
  // The center went inside: leave through the nearest face.
  const exits: Array<[number, V3]> = [
    [position.x - min[0], [-1, 0, 0]],
    [max[0] - position.x, [1, 0, 0]],
    [position.y - min[1], [0, -1, 0]],
    [max[1] - position.y, [0, 1, 0]],
    [position.z - min[2], [0, 0, -1]],
    [max[2] - position.z, [0, 0, 1]],
  ];
  const [depth, direction] = exits.reduce((best, exit) => (exit[0] < best[0] ? exit : best));
  normal.set(...direction);
  bounceOff(ball, position, velocity, normal, depth + ball.radius, direction[1] === 1);
}

/** The rim is a thin ring, so a ball can really drop through it. */
function collideRim(ball: BallState, position: THREE.Vector3, velocity: THREE.Vector3) {
  const dx = position.x;
  const dz = position.z - HOOP.rimZ;
  const flat = Math.hypot(dx, dz);
  if (flat < 1e-5) return;
  closest.set((dx / flat) * HOOP.rimRadius, HOOP.rimY, HOOP.rimZ + (dz / flat) * HOOP.rimRadius);
  normal.copy(position).sub(closest);
  const distance = normal.length();
  const reach = ball.radius + 0.012;
  if (distance >= reach || distance < 1e-6) return;
  normal.divideScalar(distance);
  bounceOff(ball, position, velocity, normal, reach - distance, false);
}

function collideGroup(ball: BallState, group: ColliderGroup, withRim: boolean) {
  const cos = Math.cos(group.yaw);
  const sin = Math.sin(group.yaw);
  const px = ball.position.x - group.x;
  const pz = ball.position.z - group.z;
  local.set(px * cos - pz * sin, ball.position.y, px * sin + pz * cos);
  localVelocity.set(ball.velocity.x * cos - ball.velocity.z * sin, ball.velocity.y, ball.velocity.x * sin + ball.velocity.z * cos);
  group.boxes.forEach((target) => collideBox(ball, local, localVelocity, target));
  if (withRim) collideRim(ball, local, localVelocity);
  ball.position.set(local.x * cos + local.z * sin + group.x, local.y, -local.x * sin + local.z * cos + group.z);
  ball.velocity.set(localVelocity.x * cos + localVelocity.z * sin, localVelocity.y, -localVelocity.x * sin + localVelocity.z * cos);
}

function collideRoom(ball: BallState) {
  const { position: p, velocity: v, radius: r, bounce } = ball;
  if (p.y < r) {
    p.y = r;
    if (v.y < 0) {
      const rebound = -v.y * bounce;
      v.y = rebound < REST_BOUNCE ? 0 : rebound;
      v.x *= 0.992;
      v.z *= 0.992;
    }
    ball.grounded = true;
  }
  if (p.y > ROOM.maxY - r) {
    p.y = ROOM.maxY - r;
    v.y = -Math.abs(v.y) * bounce;
  }
  if (p.x < ROOM.minX + r) {
    p.x = ROOM.minX + r;
    v.x = Math.abs(v.x) * bounce;
  }
  if (p.x > ROOM.maxX - r) {
    p.x = ROOM.maxX - r;
    v.x = -Math.abs(v.x) * bounce;
  }
  if (p.z < ROOM.minZ + r) {
    p.z = ROOM.minZ + r;
    v.z = Math.abs(v.z) * bounce;
  }
  if (p.z > ROOM.maxZ - r) {
    p.z = ROOM.maxZ - r;
    v.z = -Math.abs(v.z) * bounce;
  }
}

function collideBalls(a: BallState, b: BallState, held: BallState | null) {
  delta.copy(b.position).sub(a.position);
  const reach = a.radius + b.radius;
  const distanceSq = delta.lengthSq();
  if (distanceSq >= reach * reach || distanceSq < 1e-9) return;
  const distance = Math.sqrt(distanceSq);
  delta.divideScalar(distance);
  const inverseA = a === held ? 0 : 1 / a.mass;
  const inverseB = b === held ? 0 : 1 / b.mass;
  const total = inverseA + inverseB;
  if (total === 0) return;
  const overlap = reach - distance;
  a.position.addScaledVector(delta, (-overlap * inverseA) / total);
  b.position.addScaledVector(delta, (overlap * inverseB) / total);
  scratch.copy(b.velocity).sub(a.velocity);
  const closing = scratch.dot(delta);
  if (closing >= 0) return;
  const impulse = (-(1 + Math.min(a.bounce, b.bounce)) * closing) / total;
  a.velocity.addScaledVector(delta, -impulse * inverseA);
  b.velocity.addScaledVector(delta, impulse * inverseB);
  if (Math.abs(closing) > REST_SPEED) a.asleep = b.asleep = false;
}

function funnelIntoRim(ball: BallState) {
  const { position: p, velocity: v } = ball;
  if (v.y >= 0 || p.y < HOOP.rimY - 0.02 || p.y > HOOP.rimY + FUNNEL.height) return;
  const rim = rimPoint();
  if (Math.hypot(rim.x - p.x, rim.z - p.z) > FUNNEL.radius) return;
  const drag = Math.exp(-FUNNEL.drag * STEP);
  v.x = (v.x + (rim.x - p.x) * FUNNEL.pull * STEP) * drag;
  v.z = (v.z + (rim.z - p.z) * FUNNEL.pull * STEP) * drag;
}

function stepBall(ball: BallState, held: BallState | null, target: THREE.Vector3) {
  if (ball.asleep) return;
  ball.grounded = false;
  if (ball === held) {
    ball.velocity.copy(target).sub(ball.position).multiplyScalar(HOLD_STRENGTH).clampLength(0, MAX_SPEED);
  } else {
    ball.velocity.y -= GRAVITY * STEP;
    ball.velocity.multiplyScalar(1 - AIR_DRAG * STEP);
    funnelIntoRim(ball);
  }
  ball.position.addScaledVector(ball.velocity, STEP);
  GROUPS.forEach((group) => collideGroup(ball, group, group === HOOP_COLLIDERS));
  collideRoom(ball);

  if (ball.grounded && ball !== held) {
    const drag = Math.exp(-ROLL_DRAG * STEP);
    ball.velocity.x *= drag;
    ball.velocity.z *= drag;
    ball.spin.set(ball.velocity.z, 0, -ball.velocity.x).divideScalar(ball.radius);
    if (ball.velocity.lengthSq() < REST_SPEED * REST_SPEED) {
      ball.velocity.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.asleep = true;
    }
  } else if (ball === held) {
    ball.spin.set(ball.velocity.z, 0, -ball.velocity.x).divideScalar(ball.radius).multiplyScalar(0.4);
  }

  const angle = ball.spin.length() * STEP;
  if (angle > 1e-6) {
    axis.copy(ball.spin).normalize();
    turn.setFromAxisAngle(axis, angle);
    ball.rotation.premultiply(turn);
  }
}

const toGroup = (group: ColliderGroup, position: THREE.Vector3) => {
  const cos = Math.cos(group.yaw);
  const sin = Math.sin(group.yaw);
  const px = position.x - group.x;
  const pz = position.z - group.z;
  return { x: px * cos - pz * sin, z: px * sin + pz * cos };
};

const fromGroup = (group: ColliderGroup, x: number, y: number, z: number) => {
  const cos = Math.cos(group.yaw);
  const sin = Math.sin(group.yaw);
  return new THREE.Vector3(x * cos + z * sin + group.x, y, -x * sin + z * cos + group.z);
};

/** A basket is a ball falling through the rim. A goal is a ball crossing the line. */
function detectScore(ball: BallState, previousY: number): ScoreKind | null {
  const goal = toGroup(GOAL_COLLIDERS, ball.position);
  const insideGoal = Math.abs(goal.x) < halfGoal && ball.position.y < GOAL.height && goal.z < -ball.radius * 0.7 && goal.z > -GOAL.depth - 0.02;
  const enteredGoal = insideGoal && !ball.inGoal;
  if (insideGoal) ball.inGoal = true;
  else if (goal.z > 0.03 || Math.abs(goal.x) > halfGoal + 0.1) ball.inGoal = false;

  const hoop = toGroup(HOOP_COLLIDERS, ball.position);
  const throughRim = previousY >= HOOP.rimY && ball.position.y < HOOP.rimY && Math.hypot(hoop.x, hoop.z - HOOP.rimZ) < HOOP.rimRadius;
  const kind: ScoreKind | null = throughRim ? "hoop" : enteredGoal ? "goal" : null;
  if (!kind) return null;
  const now = performance.now();
  if (now - ball.scoredAt < SCORE_COOLDOWN_MS) return null;
  ball.scoredAt = now;
  return kind;
}

const rimPoint = () => fromGroup(HOOP_COLLIDERS, 0, HOOP.rimY, HOOP.rimZ);

/**
 * The mouse moves a ball on a flat plane, so it can't choose how deep the ball flies.
 * A throw that would come down close to the rim gets its depth lined up with it.
 */
function aimAtRim(ball: BallState) {
  const { position: p, velocity: v } = ball;
  if (v.length() < AIM_MIN_SPEED) return;
  const rim = rimPoint();
  const reach = v.y * v.y + 2 * GRAVITY * (p.y - rim.y);
  if (reach <= 0) return;
  const time = (v.y + Math.sqrt(reach)) / GRAVITY;
  if (time < 0.08 || time > 1.8) return;
  const miss = rim.x - (p.x + v.x * time);
  if (Math.abs(miss) > AIM_REACH) return;
  const pull = Math.abs(miss) <= AIM_FULL ? 1 : 1 - ((Math.abs(miss) - AIM_FULL) / (AIM_REACH - AIM_FULL)) * 0.5;
  v.x += (miss / time) * pull;
  v.z = (rim.z - p.z) / time;
}

/** Height of the surface right under a ball, for its soft shadow. */
function surfaceBelow(ball: BallState) {
  let height = 0;
  for (const target of OFFICE.boxes) {
    const { min, max } = target;
    if (ball.position.x < min[0] || ball.position.x > max[0] || ball.position.z < min[2] || ball.position.z > max[2]) continue;
    if (max[1] <= ball.position.y + 0.02 && max[1] > height) height = max[1];
  }
  return height;
}

export function Balls() {
  const { focus, hover, score } = useSceneApi();
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  const materials = useMemo(
    () => ({ basketball: makeBasketball(), soccer: makeSoccerBall(), tennis: makeTennisBall() }) as Record<string, THREE.Material>,
    [],
  );
  const balls = useRef<BallState[]>(
    BALLS.map((config) => ({
      ...config,
      mass: config.radius ** 3,
      position: new THREE.Vector3(...config.start),
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0.7, 0.3)),
      grounded: true,
      asleep: true,
      inGoal: false,
      scoredAt: -Infinity,
    })),
  );
  const meshes = useRef<Array<THREE.Group | null>>([]);
  const spheres = useRef<Array<THREE.Mesh | null>>([]);
  const shadows = useRef<Array<THREE.Mesh | null>>([]);
  const held = useRef<BallState | null>(null);
  const holdTarget = useRef(new THREE.Vector3());
  const holdPlane = useRef(new THREE.Plane());
  const leftover = useRef(0);
  const ray = useMemo(() => new THREE.Raycaster(), []);

  const release = () => {
    if (!held.current) return;
    held.current.velocity.clampLength(0, MAX_SPEED);
    aimAtRim(held.current);
    held.current = null;
    ballInput.grabbing = false;
    ballInput.releasedAt = performance.now();
    document.body.style.cursor = "";
    wakeDogs(invalidate);
    invalidate();
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!held.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.ray.intersectPlane(holdPlane.current, new THREE.Vector3());
      if (hit) {
        // Near the hoop the ball slides back to the rim's depth, still under the pointer.
        const rim = rimPoint();
        const rimPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), rim);
        const atRim = ray.ray.intersectPlane(rimPlane, new THREE.Vector3());
        if (atRim) hit.lerp(atRim, 1 - THREE.MathUtils.smoothstep(Math.hypot(atRim.x - rim.x, atRim.y - rim.y - 0.12), 0.35, 0.95));
        const r = held.current.radius;
        hit.x = THREE.MathUtils.clamp(hit.x, ROOM.minX + r, ROOM.maxX - r);
        hit.y = THREE.MathUtils.clamp(hit.y, r, ROOM.maxY - r);
        hit.z = THREE.MathUtils.clamp(hit.z, ROOM.minZ + r, ROOM.maxZ - r);
        holdTarget.current.copy(hit);
      }
      invalidate();
    };
    const up = () => release();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      ballInput.grabbing = false;
    };
  }, [camera, gl, invalidate, ray]);

  useEffect(() => {
    if (focus) release();
  }, [focus]);

  useEffect(() => {
    liveBalls.push(...balls.current);
    return () => void (liveBalls.length = 0);
  }, []);

  const celebrate = (kind: ScoreKind) => {
    if (focus) return;
    const spot = kind === "hoop" ? fromGroup(HOOP_COLLIDERS, 0, HOOP.rimY, HOOP.rimZ) : fromGroup(GOAL_COLLIDERS, 0, GOAL.height * 0.7, 0);
    spot.project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    score(kind, rect.left + ((spot.x + 1) / 2) * rect.width, rect.top + ((1 - spot.y) / 2) * rect.height);
  };

  useFrame((_, frame) => {
    const list = balls.current;
    CHAIR.x = chairPose.x;
    CHAIR.z = chairPose.z;
    CHAIR.yaw = chairPose.yaw;
    if (chairPose.moving) {
      list.forEach((ball) => {
        if (Math.hypot(ball.position.x - chairPose.x, ball.position.z - chairPose.z) < 0.75) ball.asleep = false;
      });
    }
    leftover.current += Math.min(frame, MAX_FRAME);
    while (leftover.current >= STEP) {
      leftover.current -= STEP;
      list.forEach((ball) => {
        if (ball.asleep) return;
        const previousY = ball.position.y;
        stepBall(ball, held.current, holdTarget.current);
        const kind = detectScore(ball, previousY);
        if (kind) celebrate(kind);
      });
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) collideBalls(list[i], list[j], held.current);
      }
    }

    list.forEach((ball, i) => {
      const group = meshes.current[i];
      const sphere = spheres.current[i];
      const shadow = shadows.current[i];
      if (group) group.position.copy(ball.position);
      if (sphere) sphere.quaternion.copy(ball.rotation);
      if (shadow) {
        const surface = surfaceBelow(ball);
        const height = Math.max(ball.position.y - ball.radius - surface, 0);
        const fade = 1 / (1 + height * 2.2);
        const size = ball.radius * (3 + height * 1.6);
        shadow.position.set(ball.position.x, surface + 0.004, ball.position.z);
        shadow.scale.set(size, size, 1);
        (shadow.material as THREE.MeshBasicMaterial).opacity = 0.78 * fade;
      }
    });
    if (held.current || list.some((ball) => !ball.asleep && ball.velocity.lengthSq() > 0.36)) wakeDogs(invalidate);
    if (list.some((ball) => !ball.asleep) || held.current) invalidate();
  });

  const grab = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (focus) return;
    event.stopPropagation();
    const ball = balls.current[index];
    held.current = ball;
    ball.asleep = false;
    ballInput.grabbing = true;
    hover(null);
    wakeDogs(invalidate);
    holdTarget.current.copy(ball.position);
    holdPlane.current.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), ball.position);
    document.body.style.cursor = "grabbing";
    invalidate();
  };

  const hoverHandlers = {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (!focus && !held.current && event.pointerType === "mouse") document.body.style.cursor = "grab";
    },
    onPointerOut: () => {
      if (!held.current) document.body.style.cursor = "";
    },
    onClick: (event: ThreeEvent<MouseEvent>) => event.stopPropagation(),
  };

  return (
    <>
      {BALLS.map((ball, i) => (
        <group key={ball.id}>
          <mesh ref={(mesh) => void (shadows.current[i] = mesh)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <planeGeometry />
            <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
          </mesh>
          <group ref={(group) => void (meshes.current[i] = group)} position={ball.start}>
            <mesh ref={(mesh) => void (spheres.current[i] = mesh)} material={materials[ball.id]} raycast={() => undefined}>
              <sphereGeometry args={[ball.radius, BALL_SEGMENTS[0], BALL_SEGMENTS[1]]} />
            </mesh>
            <mesh visible={false} onPointerDown={grab(i)} {...hoverHandlers}>
              <sphereGeometry args={[ball.hit, 14, 10]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}
