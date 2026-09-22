import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as skinClone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { audio } from "../../game/audio";
import { useGameStore } from "../../game/store";
import {
  ARENA_RADIUS,
  hitboxes,
  newZombieId,
  playerState,
  zombies,
  type ZombieData,
} from "../../game/world";

const MODEL = "/models/character-zombie.glb";
const RUNNER = "/models/character-skeleton.glb";
useGLTF.preload(MODEL);
useGLTF.preload(RUNNER);

const MAX_ALIVE = 16;
const ATTACK_RANGE = 1.9;
const ATTACK_COOLDOWN = 1.1;
const CORPSE_LINGER = 6;

export type SpawnKind = "walker" | "runner";

function Zombie({ id, kind }: { id: number; kind: SpawnKind }) {
  const group = useRef<THREE.Group>(null);
  const url = kind === "runner" ? RUNNER : MODEL;
  const { scene, animations } = useGLTF(url);
  const model = useMemo(() => {
    const c = skinClone(scene);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    c.scale.setScalar(1.8 / (size.y || 1));
    const scaled = new THREE.Box3().setFromObject(c);
    c.position.y -= scaled.min.y;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const { actions } = useAnimations(animations, group);
  const current = useRef<string | null>(null);
  const head = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const parts = [head.current, body.current].filter(Boolean) as THREE.Mesh[];
    parts.forEach((p) => {
      p.userData["zid"] = id;
      hitboxes.push(p);
    });
    return () => {
      parts.forEach((p) => {
        const i = hitboxes.indexOf(p);
        if (i >= 0) hitboxes.splice(i, 1);
      });
    };
  }, [id]);

  useFrame(() => {
    const z = zombies.get(id);
    const g = group.current;
    if (!z || !g) return;
    g.position.copy(z.pos);
    g.rotation.y = z.yaw;

    const want =
      z.state === "dead" ? "die" : z.state === "attack" ? "attack-melee-right" : "walk";
    if (current.current !== want) {
      const next = actions[want] ?? actions["walk"];
      if (current.current) actions[current.current]?.fadeOut(0.18);
      if (next) {
        if (want === "die") {
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = true;
        }
        next.reset().fadeIn(0.18).play();
        next.timeScale = want === "walk" ? (kind === "runner" ? 1.8 : 1.05) : 1.2;
      }
      current.current = want;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      {/* invisible hitscan proxies */}
      <mesh ref={head} position={[0, 1.58, 0]}>
        <boxGeometry args={[0.46, 0.46, 0.46]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <mesh ref={body} position={[0, 0.85, 0]}>
        <boxGeometry args={[0.7, 1.25, 0.6]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Zombies() {
  const [list, setList] = useState<{ id: number; kind: SpawnKind }[]>([]);
  const toSpawn = useRef(0);
  const spawnTimer = useRef(0);
  const waveBreak = useRef(0);
  const groanTimer = useRef(0);
  const hurtFlash = useRef(0);

  // Reset when a new run starts.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.state === "playing" && prev.state === "menu") {
          zombies.clear();
          setList([]);
          toSpawn.current = 0;
          spawnTimer.current = 0;
          waveBreak.current = 2;
        }
      }),
    [],
  );

  const spawn = (kind: SpawnKind) => {
    const id = newZombieId();
    const a = Math.random() * Math.PI * 2;
    const r = ARENA_RADIUS - 2 - Math.random() * 6;
    const wave = useGameStore.getState().wave;
    const hp = (kind === "runner" ? 70 : 100) + wave * 22;
    zombies.set(id, {
      id,
      pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
      yaw: 0,
      hp,
      maxHp: hp,
      speed:
        (kind === "runner" ? 3.6 : 1.9) + Math.min(wave * 0.16, 2.2) + Math.random() * 0.4,
      state: "walk",
      deadAt: 0,
      lastAttack: 0,
    });
    setList((p) => [...p, { id, kind }]);
  };

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGameStore.getState();
    if (store.state !== "playing") return;
    const now = state.clock.elapsedTime;

    // --- wave director ---
    const alive = [...zombies.values()].filter((z) => z.state !== "dead").length;
    if (toSpawn.current === 0 && alive === 0) {
      waveBreak.current -= delta;
      if (waveBreak.current <= 0) {
        const wave = store.wave + 1;
        const count = 5 + Math.floor(wave * 2.6);
        toSpawn.current = count;
        useGameStore.setState({
          wave,
          remaining: count,
          waveBanner: `WAVE ${wave}`,
          reserve: store.reserve + 30,
        });
        audio.wave();
        setTimeout(() => useGameStore.setState({ waveBanner: null }), 2000);
        waveBreak.current = 6;
      }
    }

    if (toSpawn.current > 0) {
      spawnTimer.current -= delta;
      if (spawnTimer.current <= 0 && alive < MAX_ALIVE) {
        const runnerChance = Math.min(0.08 + store.wave * 0.05, 0.45);
        spawn(Math.random() < runnerChance ? "runner" : "walker");
        toSpawn.current--;
        spawnTimer.current = Math.max(0.35, 1.5 - store.wave * 0.09);
      }
    }

    // --- ambience ---
    groanTimer.current -= delta;
    if (groanTimer.current <= 0 && alive > 0) {
      audio.groan();
      groanTimer.current = 1.5 + Math.random() * 3;
    }

    // --- per-zombie AI ---
    let damage = 0;
    const remove: number[] = [];
    for (const z of zombies.values()) {
      if (z.state === "dead") {
        if (now - z.deadAt > CORPSE_LINGER) remove.push(z.id);
        continue;
      }

      const dx = playerState.pos.x - z.pos.x;
      const dz = playerState.pos.z - z.pos.z;
      const dist = Math.hypot(dx, dz);
      const targetYaw = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(targetYaw - z.yaw), Math.cos(targetYaw - z.yaw));
      const turn = 4 * delta;
      diff = Math.max(-turn, Math.min(turn, diff));
      z.yaw += diff;

      if (dist > ATTACK_RANGE) {
        z.state = "walk";
        // simple separation so the horde doesn't stack into one body
        let sx = 0;
        let sz = 0;
        for (const o of zombies.values()) {
          if (o === z || o.state === "dead") continue;
          const ox = z.pos.x - o.pos.x;
          const oz = z.pos.z - o.pos.z;
          const d = Math.hypot(ox, oz);
          if (d > 0.001 && d < 1.3) {
            sx += (ox / d) * (1.3 - d);
            sz += (oz / d) * (1.3 - d);
          }
        }
        z.pos.x += (Math.sin(z.yaw) * z.speed + sx * 2.2) * delta;
        z.pos.z += (Math.cos(z.yaw) * z.speed + sz * 2.2) * delta;
      } else {
        z.state = "attack";
        if (now - z.lastAttack > ATTACK_COOLDOWN) {
          z.lastAttack = now;
          damage += 9 + Math.min(store.wave, 8);
        }
      }
    }

    if (remove.length) {
      remove.forEach((id) => zombies.delete(id));
      setList((p) => p.filter((e) => !remove.includes(e.id)));
    }

    if (damage > 0) {
      const health = Math.max(0, store.health - damage);
      hurtFlash.current = 1;
      audio.hurt();
      useGameStore.setState({ health });
      if (health <= 0) useGameStore.getState().gameOver();
    }
  });

  return (
    <>
      {list.map((e) => (
        <Zombie key={e.id} id={e.id} kind={e.kind} />
      ))}
    </>
  );
}
