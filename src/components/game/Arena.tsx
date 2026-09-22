import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skinClone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { ARENA_RADIUS, seeded } from "../../game/world";
import { makeGroundTexture } from "../../game/textures";

const PROPS = [
  "/models/gravestone-cross.glb",
  "/models/gravestone-round.glb",
  "/models/gravestone-bevel.glb",
  "/models/coffin.glb",
  "/models/crypt-small.glb",
  "/models/crypt-small-roof.glb",
  "/models/iron-fence.glb",
  "/models/fence.glb",
  "/models/pine.glb",
  "/models/fire-basket.glb",
  "/models/crate-medium.glb",
];
PROPS.forEach((p) => useGLTF.preload(p));

export function Ground() {
  const tex = useMemo(() => makeGroundTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[ARENA_RADIUS + 25, 64]} />
      <meshStandardMaterial map={tex} color="#7d7a6e" roughness={1} />
    </mesh>
  );
}

type Placed = {
  url: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
};

function useLayout(): Placed[] {
  return useMemo(() => {
    const rnd = seeded(20260922);
    const out: Placed[] = [];

    // gravestones + coffins scattered through the yard
    const stones = [
      "/models/gravestone-cross.glb",
      "/models/gravestone-round.glb",
      "/models/gravestone-bevel.glb",
      "/models/coffin.glb",
    ];
    for (let i = 0; i < 64; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 5 + rnd() * (ARENA_RADIUS - 8);
      out.push({
        url: stones[Math.floor(rnd() * stones.length)],
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
        rot: rnd() * Math.PI * 2,
        scale: 0.9 + rnd() * 0.5,
      });
    }

    // crypts as cover
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const r = 16 + rnd() * 10;
      const p: [number, number, number] = [Math.cos(a) * r, 0, Math.sin(a) * r];
      const rot = rnd() * Math.PI * 2;
      out.push({ url: "/models/crypt-small.glb", pos: p, rot, scale: 1.4 });
      out.push({ url: "/models/crypt-small-roof.glb", pos: p, rot, scale: 1.4 });
    }

    // dead pines around the rim
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = ARENA_RADIUS - 4 + rnd() * 16;
      out.push({
        url: "/models/pine.glb",
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
        rot: rnd() * Math.PI * 2,
        scale: 1.6 + rnd() * 1.4,
      });
    }

    // iron fence ring marking the play boundary
    const segs = 54;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      out.push({
        url: i % 7 === 0 ? "/models/fence.glb" : "/models/iron-fence.glb",
        pos: [Math.cos(a) * ARENA_RADIUS, 0, Math.sin(a) * ARENA_RADIUS],
        rot: -a + Math.PI / 2,
        scale: 1.6,
      });
    }

    // braziers (light pools) + supply crates
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      out.push({
        url: "/models/fire-basket.glb",
        pos: [Math.cos(a) * 12, 0, Math.sin(a) * 12],
        rot: 0,
        scale: 1.2,
      });
      out.push({
        url: "/models/crate-medium.glb",
        pos: [Math.cos(a + 0.6) * 9, 0, Math.sin(a + 0.6) * 9],
        rot: rnd() * 3,
        scale: 1,
      });
    }

    return out;
  }, []);
}

function Prop({ item }: { item: Placed }) {
  const { scene } = useGLTF(item.url);
  const object = useMemo(() => {
    const c = skinClone(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive
      object={object}
      position={item.pos}
      rotation-y={item.rot}
      scale={item.scale}
    />
  );
}

/** Flickering fire light at each brazier. */
function Braziers() {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const positions = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return [Math.cos(a) * 12, 1.5, Math.sin(a) * 12] as [number, number, number];
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (l) l.intensity = 9 + Math.sin(t * 9 + i * 2.3) * 2.2 + Math.sin(t * 23 + i) * 1.1;
    });
  });

  return (
    <>
      {positions.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            lights.current[i] = l;
          }}
          position={p}
          color="#ff9a3c"
          intensity={9}
          distance={22}
          decay={2}
        />
      ))}
    </>
  );
}

export function Arena() {
  const layout = useLayout();
  return (
    <group>
      {layout.map((item, i) => (
        <Prop key={i} item={item} />
      ))}
      <Braziers />
    </group>
  );
}
