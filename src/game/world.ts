import * as THREE from "three";

export type ZombieData = {
  id: number;
  pos: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  state: "walk" | "attack" | "dead";
  deadAt: number;
  lastAttack: number;
};

/** Shared mutable state read/written inside useFrame (never in React render). */
export const playerState = {
  pos: new THREE.Vector3(0, 0, 6),
  yaw: 0,
  pitch: 0,
  bob: 0,
  recoil: 0,
  muzzle: 0,
};

export const zombies = new Map<number, ZombieData>();
/** Invisible proxy meshes used for hitscan raycasts. */
export const hitboxes: THREE.Object3D[] = [];

let nextId = 1;
export const newZombieId = () => nextId++;

export function resetWorld() {
  zombies.clear();
  hitboxes.length = 0;
  playerState.pos.set(0, 0, 6);
  playerState.yaw = 0;
  playerState.pitch = 0;
  playerState.recoil = 0;
  playerState.muzzle = 0;
}

export const ARENA_RADIUS = 42;

/** Deterministic pseudo-random so the graveyard layout is stable. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
