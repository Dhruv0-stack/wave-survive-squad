import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const MAX = 240;
const dummy = new THREE.Object3D();

type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number };
const pool: P[] = Array.from({ length: MAX }, () => ({
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
}));

export function burst(at: THREE.Vector3, count = 14, power = 5) {
  let spawned = 0;
  for (const p of pool) {
    if (p.life > 0 || spawned >= count) continue;
    p.x = at.x;
    p.y = at.y;
    p.z = at.z;
    p.vx = (Math.random() - 0.5) * power;
    p.vy = Math.random() * power * 0.7 + 1;
    p.vz = (Math.random() - 0.5) * power;
    p.life = 1;
    spawned++;
  }
}

export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const mesh = meshRef.current;
    if (!mesh) return;
    pool.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= delta * 1.8;
        p.vy -= 16 * delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        dummy.position.set(p.x, Math.max(p.y, 0.02), p.z);
        dummy.rotation.set(p.x, p.y, p.z);
        dummy.scale.setScalar(Math.max(p.life, 0) * 0.16);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#8e1616" />
    </instancedMesh>
  );
}
