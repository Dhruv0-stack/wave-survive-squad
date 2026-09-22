import { Environment, Lightformer, Html, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { useGameStore } from "../../game/store";
import { playerState } from "../../game/world";
import { Arena, Ground } from "./Arena";
import { HUD } from "./HUD";
import { Particles } from "./Particles";
import { Player } from "./Player";
import { Weapon } from "./Weapon";
import { Zombies } from "./Zombies";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="whitespace-nowrap font-mono text-sm text-stone-300">
        raising the dead… {Math.round(progress)}%
      </div>
    </Html>
  );
}

function Stage() {
  return (
    <>
      <color attach="background" args={["#0a0c12"]} />
      <fogExp2 attach="fog" args={["#0a0c12", 0.028]} />
      <hemisphereLight args={["#6f83ab", "#1d1a16", 1.1]} />
      <ambientLight intensity={0.7} color="#3d4a6b" />
      {/* moonlight */}
      <directionalLight
        position={[-24, 30, -12]}
        intensity={2.2}
        color="#9fb6e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={90}
      />
      <Environment>
        <Lightformer intensity={0.6} color="#6c82b8" position={[0, 12, 0]} scale={[18, 18, 1]} />
        <Lightformer
          intensity={0.35}
          color="#40331f"
          position={[-8, 2, -6]}
          rotation-y={Math.PI / 2}
          scale={[24, 3, 1]}
        />
      </Environment>
      <Ground />
    </>
  );
}

export function GameCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onClick = () => {
      const s = useGameStore.getState();
      if (s.state === "paused") s.resume();
      if (useGameStore.getState().state !== "playing") return;
      if (document.pointerLockElement !== el) void el.requestPointerLock?.();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      playerState.yaw -= e.movementX * 0.0022;
      playerState.pitch -= e.movementY * 0.0022;
      playerState.pitch = Math.max(-1.2, Math.min(1.2, playerState.pitch));
    };
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === el;
      setLocked(isLocked);
      if (!isLocked && useGameStore.getState().state === "playing")
        useGameStore.getState().pause();
    };

    el.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, []);

  // grab pointer lock as soon as a run starts
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.state === "playing" && prev.state !== "playing")
          void wrapRef.current?.requestPointerLock?.();
        if (s.state !== "playing" && document.pointerLockElement)
          document.exitPointerLock();
      }),
    [],
  );

  return (
    <div ref={wrapRef} className="fixed inset-0 cursor-crosshair bg-[#0a0c12]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.7, 8], fov: 72, near: 0.05, far: 200 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Stage />
        <Suspense fallback={<Loader />}>
          <Arena />
          <Zombies />
          <Weapon />
        </Suspense>
        <Particles />
        <Player />
      </Canvas>
      <HUD locked={locked} />
    </div>
  );
}
