"use client";

import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  Euler,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Vector2,
  Vector3,
} from "three";

/* ── Inline shaders ── */

const vertexShader = /* glsl */ `
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
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
attribute vec3 noise;
attribute float scale;

uniform float uTime;
uniform vec2 uResolution;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  modelPosition.x += snoise(vec2(noise.x, uTime * speed)) * scale;
  modelPosition.y += snoise(vec2(noise.y, uTime * speed)) * scale;
  modelPosition.z += snoise(vec2(noise.z, uTime * speed)) * scale;

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPostion = projectionMatrix * viewPosition;

  gl_Position = projectionPostion;
  gl_PointSize = size * 100.;
  gl_PointSize *= (1.0 / - viewPosition.z);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float strength = 0.05 / distanceToCenter - 0.1;

  gl_FragColor = vec4(uColor, strength);
}
`;

/* ── Route-based arm poses ── */

interface ArmPose {
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
}

const POSES: Record<string, ArmPose> = {
  home: {
    position: [0.28, -0.78, 0],
    scale: 0.035,
    rotation: [0, 90, 0],
  },
};

function getPoseForPath(_pathname: string): ArmPose {
  return POSES.home;
}

/* ── Particles ── */

function Particles({
  width = 300,
  height = 300,
  depth = 300,
  count = 120,
  size = 120,
}: {
  width?: number;
  height?: number;
  depth?: number;
  count?: number;
  size?: number;
}) {
  const positions = useMemo(() => {
    const arr = new Array(count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = MathUtils.randFloatSpread(width);
      arr[i + 1] = MathUtils.randFloatSpread(height);
      arr[i + 2] = MathUtils.randFloatSpread(depth);
    }
    return Float32Array.from(arr);
  }, [count, width, height, depth]);

  const noise = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: count * 3 }, () => Math.random() * 100)
      ),
    [count]
  );

  const sizes = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: count }, () => Math.random() * size)
      ),
    [count, size]
  );

  const speeds = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: count }, () => Math.random() * 0.2)
      ),
    [count]
  );

  const scales = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: count }, () => Math.random() * 100)
      ),
    [count]
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new Color("#60a5fa") },
      uResolution: { value: new Vector2(width, height) },
    }),
    [height, width]
  );

  useEffect(() => {
    uniforms.uResolution.value.set(width, height);
  }, [width, height, uniforms]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-noise" args={[noise, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-speed" args={[speeds, 1]} />
        <bufferAttribute attach="attributes-scale" args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        uniforms={uniforms}
      />
    </points>
  );
}

/* ── 3D Arm ── */

const armMaterial = new MeshPhysicalMaterial({
  color: new Color("#b0b0b0"),
  metalness: 1,
  roughness: 0.4,
  wireframe: false,
  side: DoubleSide,
});

function Arm({ pathname }: { pathname: string }) {
  const { scene: arm1 } = useGLTF("/models/arm.glb");
  const parentRef = useRef<Group>(null);
  const { viewport } = useThree();

  const targetPos = useRef(new Vector3());
  const targetRot = useRef(new Euler());
  const targetScale = useRef(1);

  useEffect(() => {
    arm1.traverse((node: Object3D) => {
      if ((node as Mesh).material) {
        (node as Mesh).material = armMaterial;
      }
    });
  }, [arm1]);

  useEffect(() => {
    const pose = getPoseForPath(pathname);
    targetPos.current.set(
      viewport.width * pose.position[0],
      viewport.height * pose.position[1],
      0
    );
    targetRot.current.set(
      MathUtils.degToRad(pose.rotation[0]),
      MathUtils.degToRad(pose.rotation[1]),
      MathUtils.degToRad(pose.rotation[2])
    );
    targetScale.current = viewport.height * pose.scale;
  }, [pathname, viewport]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!parentRef.current || initialized.current) return;
    const pose = getPoseForPath(pathname);
    const s = viewport.height * pose.scale;
    parentRef.current.scale.setScalar(s);
    parentRef.current.position.set(
      viewport.width * pose.position[0],
      viewport.height * pose.position[1],
      0
    );
    parentRef.current.rotation.set(
      MathUtils.degToRad(pose.rotation[0]),
      MathUtils.degToRad(pose.rotation[1]),
      MathUtils.degToRad(pose.rotation[2])
    );
    initialized.current = true;
  }, [pathname, viewport]);

  useFrame(() => {
    if (!parentRef.current || !initialized.current) return;

    // 1. Compute scroll progress (0 to 1)
    const scrollY = window.scrollY;
    // ensure maxScroll is at least 1 to avoid division by zero
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollY / maxScroll));

    // 2. Compute dynamic targets based on progress
    const basePose = getPoseForPath(pathname);
    
    // Creative movement sequence:
    // Move on X: drift left then slowly back
    const tX = basePose.position[0] - Math.sin(progress * Math.PI) * 0.4;
    // Move on Y: drift up to follow the scroll slightly
    const tY = basePose.position[1] + progress * 0.45;
    
    // Rotations: twist and turn dynamically
    const rX = basePose.rotation[0] + Math.sin(progress * Math.PI * 2) * 25;
    const rY = basePose.rotation[1] + progress * 140; // gradual turn
    const rZ = basePose.rotation[2] + Math.sin(progress * Math.PI) * 15;

    targetPos.current.set(
      viewport.width * tX,
      viewport.height * tY,
      0
    );
    targetRot.current.set(
      MathUtils.degToRad(rX),
      MathUtils.degToRad(rY),
      MathUtils.degToRad(rZ)
    );
    
    // Scale breathes slightly larger in the middle of the page
    targetScale.current = viewport.height * basePose.scale * (1 + Math.sin(progress * Math.PI) * 0.2);

    const speed = 0.04; // smooth interpolation speed

    parentRef.current.position.lerp(targetPos.current, speed);

    const curScale = parentRef.current.scale.x;
    const newScale = MathUtils.lerp(curScale, targetScale.current, speed);
    parentRef.current.scale.setScalar(newScale);

    parentRef.current.rotation.x = MathUtils.lerp(
      parentRef.current.rotation.x,
      targetRot.current.x,
      speed
    );
    parentRef.current.rotation.y = MathUtils.lerp(
      parentRef.current.rotation.y,
      targetRot.current.y,
      speed
    );
    parentRef.current.rotation.z = MathUtils.lerp(
      parentRef.current.rotation.z,
      targetRot.current.z,
      speed
    );
  });

  return (
    <Float floatIntensity={0.15} rotationIntensity={0.08} speed={1.5}>
      <group ref={parentRef}>
        <primitive object={arm1} scale={[1, 1, 1]} />
      </group>
    </Float>
  );
}

/* ── Scene ── */

function Content({ pathname }: { pathname: string }) {
  const { scene, viewport } = useThree();

  useEffect(() => {
    scene.background = new Color("#020817");
  }, [scene]);

  return (
    <>
      {/* Ambient — dark blue base */}
      <ambientLight args={[new Color("#04102a")]} />

      {/* Key light — blue, upper-left */}
      <group position={[-200, 150, 50]}>
        <directionalLight args={[new Color("#3b82f6"), 0.35]} />
      </group>

      {/* Fill light — blue, right-below */}
      <group position={[300, -100, 150]}>
        <directionalLight args={[new Color("#3b82f6"), 0.15]} />
      </group>

      <Particles
        width={viewport.width}
        height={viewport.height}
        depth={500}
        count={120}
        size={120}
      />
      <Arm pathname={pathname} />
    </>
  );
}

/* ── Export ── */

export default function WebGLBackground({ pathname }: { pathname: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{
          powerPreference: "high-performance",
          antialias: true,
          alpha: true,
        }}
        dpr={[1, 2]}
        orthographic
        camera={{ near: 0.01, far: 10000, position: [0, 0, 1000] }}
      >
        <Suspense fallback={null}>
          <Content pathname={pathname} />
        </Suspense>
      </Canvas>
      {/* Blue radial glow at bottom */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          height: "100vw",
          width: "200vw",
          background:
            "radial-gradient(rgb(59, 130, 246), rgba(59, 130, 246, 0) 70%)",
          transform: "translateX(-50%) translateY(50vh)",
          opacity: 0.15,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
