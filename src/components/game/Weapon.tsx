import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skinClone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { useGameStore } from "../../game/store";
import { playerState } from "../../game/world";

const URL = "/models/blaster-e.glb";
useGLTF.preload(URL);

/** First-person weapon view-model, parented to the camera. */
export function Weapon() {
  const { scene } = useGLTF(URL);
  const rig = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  const flashMesh = useRef<THREE.Mesh>(null);

  const model = useMemo(() => {
    const c = skinClone(scene);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    c.scale.setScalar(0.42 / (size.y || 1));
    c.rotation.y = Math.PI;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = false;
    });
    return c;
  }, [scene]);

  useFrame((state) => {
    const g = rig.current;
    if (!g) return;
    const store = useGameStore.getState();
    const playing = store.state === "playing";
    g.visible = playing;
    if (!playing) return;

    const cam = state.camera;
    // place in camera space
    const sway = Math.sin(playerState.bob) * 0.012;
    const lift = Math.cos(playerState.bob * 2) * 0.008;
    const reloadDip = store.reloading ? 0.18 : 0;
    const kick = playerState.recoil * 1.6;

    g.position.set(0.22 + sway, -0.2 + lift - reloadDip, -0.45 + kick * 0.6);
    g.rotation.set(
      -playerState.recoil * 2 - reloadDip * 2.2,
      Math.PI + sway * 0.6,
      store.reloading ? 0.5 : 0,
    );
    g.position.applyEuler(cam.rotation);
    g.position.add(cam.position);
    g.rotation.x += cam.rotation.x;
    g.rotation.y += cam.rotation.y;
    g.rotation.z += cam.rotation.z;

    const m = playerState.muzzle;
    if (flash.current) flash.current.intensity = m * 26;
    if (flashMesh.current) {
      flashMesh.current.visible = m > 0.15;
      flashMesh.current.scale.setScalar(0.1 + m * 0.35);
    }
  });

  return (
    <group ref={rig}>
      <primitive object={model} />
      <pointLight ref={flash} position={[0, 0.05, -0.5]} color="#ffca7a" intensity={0} distance={14} />
      <mesh ref={flashMesh} position={[0, 0.05, -0.55]} visible={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffd89b" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
