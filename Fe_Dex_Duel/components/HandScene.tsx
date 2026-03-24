"use client";

import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  MathUtils,
  Object3D,
  Vector2,
  Vector3,
  Euler,
  Group,
} from "three";

/* ─────────────────────────────────────────────────────────────────
   Particle shader (simplex-noise floating dots)
   Identical approach to stylend reference
───────────────────────────────────────────────────────────────── */
const particleVert = /* glsl */ `
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

attribute float size;
attribute float speed;
attribute vec3  noise;
attribute float scale;
uniform float uTime;
uniform vec2  uResolution;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  modelPosition.x += snoise(vec2(noise.x, uTime * speed)) * scale;
  modelPosition.y += snoise(vec2(noise.y, uTime * speed)) * scale;
  modelPosition.z += snoise(vec2(noise.z, uTime * speed)) * scale;
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position  = projectionMatrix * viewPosition;
  gl_PointSize = size * 100.0 * (1.0 / -viewPosition.z);
}
`;

const particleFrag = /* glsl */ `
uniform vec3 uColor;
void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  float strength = 0.05 / d - 0.1;
  gl_FragColor = vec4(uColor, strength);
}
`;

/* ─────────────────────────────────────────────────────────────────
   Particles component
───────────────────────────────────────────────────────────────── */
function Particles() {
  const { viewport } = useThree();
  const W = viewport.width;
  const H = viewport.height;
  const count = 120;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = MathUtils.randFloatSpread(W * 1.4);
      arr[i * 3 + 1] = MathUtils.randFloatSpread(H * 1.4);
      arr[i * 3 + 2] = MathUtils.randFloatSpread(400);
    }
    return arr;
  }, [W, H]);

  const noise  = useMemo(() => Float32Array.from({ length: count * 3 }, () => Math.random() * 100), []);
  const sizes  = useMemo(() => Float32Array.from({ length: count },     () => Math.random() * 120 + 30), []);
  const speeds = useMemo(() => Float32Array.from({ length: count },     () => Math.random() * 0.18 + 0.02), []);
  const scales = useMemo(() => Float32Array.from({ length: count },     () => Math.random() * 80 + 10), []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uColor:      { value: new Color("#10E1FF") },
    uResolution: { value: new Vector2(W, H) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => { uniforms.uTime.value = clock.elapsedTime; });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-noise"    args={[noise,     3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes,     1]} />
        <bufferAttribute attach="attributes-speed"    args={[speeds,    1]} />
        <bufferAttribute attach="attributes-scale"    args={[scales,    1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVert}
        fragmentShader={particleFrag}
        transparent
        depthWrite={false}
        uniforms={uniforms}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Arm material — silver metallic, blue lighting gives the glow
───────────────────────────────────────────────────────────────── */
const armMat = new MeshPhysicalMaterial({
  color:     new Color("#9ab8d0"),
  metalness: 1.0,
  roughness: 0.35,
  side:      DoubleSide,
});

/* ─────────────────────────────────────────────────────────────────
   Arm pose — for landing hero section
───────────────────────────────────────────────────────────────── */
interface Pose {
  position:  [number, number, number]; // viewport fractions
  scale:     number;                   // multiplied by viewport.height
  rotation:  [number, number, number]; // degrees
}

const HERO_POSE: Pose = {
  position: [0.22, -0.72, 0],
  scale:    0.032,
  rotation: [0, 90, 0],
};

const SCROLL_POSE: Pose = {
  position: [0.15, -0.42, 0],
  scale:    0.030,
  rotation: [-10, 75, 5],
};

/* ─────────────────────────────────────────────────────────────────
   Arm component
───────────────────────────────────────────────────────────────── */
function Arm({ scrollProgress }: { scrollProgress: number }) {
  const { scene: armScene } = useGLTF("/models/arm.glb");
  const groupRef = useRef<Group>(null);
  const { viewport } = useThree();

  const tgtPos   = useRef(new Vector3());
  const tgtRot   = useRef(new Euler());
  const tgtScale = useRef(1);

  /* apply material once */
  useEffect(() => {
    armScene.traverse((node: Object3D) => {
      if ((node as Mesh).isMesh) {
        (node as Mesh).material = armMat;
      }
    });
  }, [armScene]);

  /* interpolate target based on scroll */
  useEffect(() => {
    const t = scrollProgress;
    const lerpedPos: [number, number, number] = [
      MathUtils.lerp(HERO_POSE.position[0], SCROLL_POSE.position[0], t),
      MathUtils.lerp(HERO_POSE.position[1], SCROLL_POSE.position[1], t),
      0,
    ];
    const lerpedRot: [number, number, number] = [
      MathUtils.lerp(HERO_POSE.rotation[0], SCROLL_POSE.rotation[0], t),
      MathUtils.lerp(HERO_POSE.rotation[1], SCROLL_POSE.rotation[1], t),
      MathUtils.lerp(HERO_POSE.rotation[2], SCROLL_POSE.rotation[2], t),
    ];
    const lerpedScale = MathUtils.lerp(HERO_POSE.scale, SCROLL_POSE.scale, t);

    tgtPos.current.set(
      viewport.width  * lerpedPos[0],
      viewport.height * lerpedPos[1],
      lerpedPos[2],
    );
    tgtRot.current.set(
      MathUtils.degToRad(lerpedRot[0]),
      MathUtils.degToRad(lerpedRot[1]),
      MathUtils.degToRad(lerpedRot[2]),
    );
    tgtScale.current = viewport.height * lerpedScale;
  }, [scrollProgress, viewport]);

  /* set initial state immediately on first render */
  const initialized = useRef(false);
  useEffect(() => {
    if (!groupRef.current || initialized.current) return;
    const s = viewport.height * HERO_POSE.scale;
    groupRef.current.scale.setScalar(s);
    groupRef.current.position.set(
      viewport.width  * HERO_POSE.position[0],
      viewport.height * HERO_POSE.position[1],
      0,
    );
    groupRef.current.rotation.set(
      MathUtils.degToRad(HERO_POSE.rotation[0]),
      MathUtils.degToRad(HERO_POSE.rotation[1]),
      MathUtils.degToRad(HERO_POSE.rotation[2]),
    );
    initialized.current = true;
  }, [viewport]);

  /* smooth lerp every frame */
  useFrame(() => {
    if (!groupRef.current || !initialized.current) return;
    const speed = 0.018;

    groupRef.current.position.lerp(tgtPos.current, speed);

    groupRef.current.scale.setScalar(
      MathUtils.lerp(groupRef.current.scale.x, tgtScale.current, speed)
    );

    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, tgtRot.current.x, speed);
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, tgtRot.current.y, speed);
    groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, tgtRot.current.z, speed);
  });

  return (
    <Float floatIntensity={0.18} rotationIntensity={0.09} speed={1.4}>
      <group ref={groupRef}>
        <primitive object={armScene} />
      </group>
    </Float>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Scene content
───────────────────────────────────────────────────────────────── */
function SceneContent({ scrollProgress }: { scrollProgress: number }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = null; // keep transparent so page bg shows
  }, [scene]);

  return (
    <>
      {/* Dark blue ambient */}
      <ambientLight color={new Color("#04122e")} intensity={2} />

      {/* Key light — bright blue, upper-left */}
      <directionalLight
        color={new Color("#016BE5")}
        intensity={0.9}
        position={[-200, 180, 80]}
      />

      {/* Fill light — softer blue, right-below */}
      <directionalLight
        color={new Color("#0590ff")}
        intensity={0.4}
        position={[280, -120, 160]}
      />

      {/* Rim light — cyan glow from front */}
      <directionalLight
        color={new Color("#00d4ff")}
        intensity={0.25}
        position={[0, 0, 300]}
      />

      <Particles />
      <Arm scrollProgress={scrollProgress} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Exported React component
───────────────────────────────────────────────────────────────── */
export default function HandScene({ className = "" }: { className?: string }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const section = containerRef.current?.closest("section") as HTMLElement | null;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (window.innerHeight * 0.9)));
      setScrollProgress(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <Canvas
        gl={{ powerPreference: "high-performance", antialias: true, alpha: true }}
        dpr={[1, 2]}
        orthographic
        camera={{ near: 0.01, far: 10000, position: [0, 0, 1000] }}
      >
        <Suspense fallback={null}>
          <SceneContent scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>

      {/* Radial blue glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 60% 80%, rgba(1,107,229,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* preload GLB */
useGLTF.preload("/models/arm.glb");
