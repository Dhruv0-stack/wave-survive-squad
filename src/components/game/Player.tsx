import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { audio } from "../../game/audio";
import { MAG_SIZE, useGameStore } from "../../game/store";
import { useKeyboard } from "../../game/useKeyboard";
import { ARENA_RADIUS, hitboxes, playerState, zombies } from "../../game/world";
import { burst } from "./Particles";

const WALK_SPEED = 5.4;
const SPRINT_SPEED = 8.4;
const EYE_HEIGHT = 1.68;
const FIRE_RATE = 0.11;
const RELOAD_TIME = 1.5;
const BODY_DAMAGE = 45;
const HEAD_DAMAGE = 140;

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0);

export function Player() {
  const keys = useKeyboard();
  const fireCooldown = useRef(0);
  const reloadTimer = useRef(0);
  const mouseDown = useRef(false);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (e.button === 0) mouseDown.current = true;
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) mouseDown.current = false;
    };
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const startReload = () => {
    const s = useGameStore.getState();
    if (s.reloading || s.ammo >= MAG_SIZE || s.reserve <= 0) return;
    useGameStore.setState({ reloading: true });
    reloadTimer.current = RELOAD_TIME;
    audio.reload();
  };

  const shoot = (camera: THREE.Camera) => {
    const s = useGameStore.getState();
    if (s.reloading) return;
    if (s.ammo <= 0) {
      audio.empty();
      startReload();
      return;
    }
    useGameStore.setState({ ammo: s.ammo - 1 });
    audio.shot();
    playerState.recoil = Math.min(playerState.recoil + 0.05, 0.18);
    playerState.muzzle = 1;

    raycaster.setFromCamera(CENTER, camera);
    raycaster.far = 120;
    const hits = raycaster.intersectObjects(hitboxes, false);
    const hit = hits[0];
    if (!hit) return;

    const zid = hit.object.userData["zid"] as number | undefined;
    if (zid === undefined) return;
    const z = zombies.get(zid);
    if (!z || z.state === "dead") return;

    const headshot = hit.point.y > z.pos.y + 1.35;
    z.hp -= headshot ? HEAD_DAMAGE : BODY_DAMAGE;
    burst(hit.point, headshot ? 22 : 10, headshot ? 7 : 4);
    audio.hit();

    if (z.hp <= 0) {
      z.state = "dead";
      z.deadAt = performance.now() / 1000;
      audio.kill();
      const points = headshot ? 150 : 100;
      const store = useGameStore.getState();
      useGameStore.setState({
        score: store.score + points,
        kills: store.kills + 1,
        remaining: Math.max(0, store.remaining - 1),
      });
    }
  };

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const camera = state.camera;
    const store = useGameStore.getState();

    // camera always follows the player rig, even in menus (slow orbit preview)
    if (store.state !== "playing") {
      if (store.state === "menu") {
        const t = state.clock.elapsedTime * 0.12;
        camera.position.set(Math.cos(t) * 11, 3.4, Math.sin(t) * 11);
        camera.lookAt(0, 1.4, 0);
      }
      return;
    }

    // --- look ---
    camera.rotation.order = "YXZ";
    camera.rotation.y = playerState.yaw;
    camera.rotation.x = playerState.pitch + playerState.recoil;
    camera.rotation.z = 0;
    playerState.recoil *= Math.exp(-9 * delta);
    playerState.muzzle *= Math.exp(-18 * delta);

    // --- move ---
    const k = keys.current;
    const fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const strafe = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    FORWARD.normalize();
    RIGHT.crossVectors(FORWARD, camera.up).normalize();
    MOVE.set(0, 0, 0).addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, strafe);

    const sprinting = k.has("ShiftLeft") && fwd > 0;
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (MOVE.lengthSq() > 0) {
      MOVE.normalize().multiplyScalar(speed * delta);
      playerState.pos.add(MOVE);
      playerState.bob += delta * (sprinting ? 13 : 9);
    } else {
      playerState.bob += delta * 1.6;
    }

    // keep inside the fenced graveyard
    const r = Math.hypot(playerState.pos.x, playerState.pos.z);
    const limit = ARENA_RADIUS - 2;
    if (r > limit) {
      playerState.pos.x *= limit / r;
      playerState.pos.z *= limit / r;
    }

    const bobY = Math.sin(playerState.bob) * (MOVE.lengthSq() > 0 ? 0.045 : 0.012);
    camera.position.set(
      playerState.pos.x,
      EYE_HEIGHT + bobY,
      playerState.pos.z,
    );

    // --- weapon ---
    if (store.reloading) {
      reloadTimer.current -= delta;
      if (reloadTimer.current <= 0) {
        const need = MAG_SIZE - store.ammo;
        const take = Math.min(need, store.reserve);
        useGameStore.setState({
          ammo: store.ammo + take,
          reserve: store.reserve - take,
          reloading: false,
        });
      }
    } else {
      if (k.has("KeyR")) startReload();
      fireCooldown.current -= delta;
      if (mouseDown.current && fireCooldown.current <= 0) {
        fireCooldown.current = FIRE_RATE;
        shoot(camera);
      }
    }
  });

  return null;
}
