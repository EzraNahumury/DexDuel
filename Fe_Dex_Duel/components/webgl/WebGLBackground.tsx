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

/* ─────────────────────────────────────────────────────────────────
   Particle shaders — Simplex noise floating dots
───────────────────────────────────────────────────────────────── */
const particleVert = /* glsl */ `
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
attribute float size;attribute float speed;attribute vec3 noise;attribute float scale;
uniform float uTime;uniform vec2 uResolution;
void main(){
  vec4 mp=modelMatrix*vec4(position,1.0);
  mp.x+=snoise(vec2(noise.x,uTime*speed))*scale;
  mp.y+=snoise(vec2(noise.y,uTime*speed))*scale;
  mp.z+=snoise(vec2(noise.z,uTime*speed))*scale;
  vec4 vp=viewMatrix*mp;
  gl_Position=projectionMatrix*vp;
  gl_PointSize=size*100.0*(1.0/-vp.z);
}
`;

const particleFrag = /* glsl */ `
uniform vec3 uColor;
void main(){
  float d=distance(gl_PointCoord,vec2(0.5));
  float s=0.05/d-0.1;
  gl_FragColor=vec4(uColor,s);
}
`;

/* ─────────────────────────────────────────────────────────────────
   Scroll-based pose keyframes
   Mirrors stylend's route-based POSES but uses scroll fraction (0→1)
───────────────────────────────────────────────────────────────── */
interface Pose {
  at:       number;
  position: [number, number, number]; // fraction of viewport
  scale:    number;                   // fraction of viewport height
  rotation: [number, number, number]; // degrees
}

const POSES: Pose[] = [
  // Hero — palm reaching up from bottom-right
  { at: 0.00, position: [ 0.25, -0.80, 0], scale: 0.035, rotation: [   0,   90,    0] },
  // Why DexDuel — tilted right
  { at: 0.18, position: [ 0.32, -0.55, 0], scale: 0.028, rotation: [ -45, -135,  -45] },
  // How It Works — shifts to left side
  { at: 0.36, position: [-0.12, -0.70, 0], scale: 0.024, rotation: [ -15,  -80,  -20] },
  // Live Battles — bottom-left, different angle
  { at: 0.54, position: [-0.20, -0.65, 0], scale: 0.030, rotation: [   0,  -14,  -16] },
  // Arena Legends — center, rotated
  { at: 0.72, position: [ 0.15, -0.68, 0], scale: 0.025, rotation: [ -45, -135,  -45] },
  // Footer — palm open lower-right
  { at: 1.00, position: [ 0.30, -0.71, 0], scale: 0.032, rotation: [   0,  200,  -16] },
];

function blendPose(scrollFrac: number): Pose {
  const f = Math.max(0, Math.min(1, scrollFrac));
  let i = 0;
  for (; i < POSES.length - 1; i++) {
    if (f <= POSES[i + 1].at) break;
  }
  const a = POSES[i];
  const b = POSES[Math.min(i + 1, POSES.length - 1)];
  const span = b.at - a.at;
  const t = span === 0 ? 0 : (f - a.at) / span;
  return {
    at:       f,
    position: [
      MathUtils.lerp(a.position[0], b.position[0], t),
      MathUtils.lerp(a.position[1], b.position[1], t),
      0,
    ],
    scale:    MathUtils.lerp(a.scale, b.scale, t),
    rotation: [
      MathUtils.lerp(a.rotation[0], b.rotation[0], t),
      MathUtils.lerp(a.rotation[1], b.rotation[1], t),
      MathUtils.lerp(a.rotation[2], b.rotation[2], t),
    ],
  };
}

/* ─────────────────────────────────────────────────────────────────
   Particles
───────────────────────────────────────────────────────────────── */
function Particles() {
  const { viewport } = useThree();
  const count = 110;

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i*3]   = MathUtils.randFloatSpread(viewport.width  * 1.6);
      a[i*3+1] = MathUtils.randFloatSpread(viewport.height * 1.6);
      a[i*3+2] = MathUtils.randFloatSpread(500);
    }
    return a;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noise  = useMemo(() => Float32Array.from({length: count*3}, () => Math.random()*100), []);
  const sizes  = useMemo(() => Float32Array.from({length: count},   () => Math.random()*110+25), []);
  const speeds = useMemo(() => Float32Array.from({length: count},   () => Math.random()*0.18+0.02), []);
  const scales = useMemo(() => Float32Array.from({length: count},   () => Math.random()*80+10), []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uColor:      { value: new Color("#10E1FF") },
    uResolution: { value: new Vector2(viewport.width, viewport.height) },
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
   Arm material — metallic silver; blue lights create the tint
───────────────────────────────────────────────────────────────── */
const armMat = new MeshPhysicalMaterial({
  color:       new Color("#6090c0"),
  metalness:   0.7,
  roughness:   0.5,
  transparent: true,
  opacity:     0.2,
  side:        DoubleSide,
  depthWrite:  false,
});

/* ─────────────────────────────────────────────────────────────────
   Arm — loads arm.glb, applies scroll-driven pose via lerp
───────────────────────────────────────────────────────────────── */
function Arm({ scrollFrac }: { scrollFrac: number }) {
  const { scene: armScene } = useGLTF("/models/arm.glb");
  const groupRef = useRef<Group>(null);
  const { viewport } = useThree();

  const tgtPos   = useRef(new Vector3());
  const tgtRot   = useRef(new Euler());
  const tgtScale = useRef(1);

  /* apply material once */
  useEffect(() => {
    armScene.traverse((node: Object3D) => {
      if ((node as Mesh).isMesh) (node as Mesh).material = armMat;
    });
  }, [armScene]);

  /* update target whenever scroll or viewport changes */
  useEffect(() => {
    const pose = blendPose(scrollFrac);
    tgtPos.current.set(
      viewport.width  * pose.position[0],
      viewport.height * pose.position[1],
      0,
    );
    tgtRot.current.set(
      MathUtils.degToRad(pose.rotation[0]),
      MathUtils.degToRad(pose.rotation[1]),
      MathUtils.degToRad(pose.rotation[2]),
    );
    tgtScale.current = viewport.height * pose.scale;
  }, [scrollFrac, viewport]);

  /* set initial state once on mount */
  const inited = useRef(false);
  useEffect(() => {
    if (!groupRef.current || inited.current) return;
    const pose = blendPose(0);
    const s = viewport.height * pose.scale;
    groupRef.current.scale.setScalar(s);
    groupRef.current.position.set(
      viewport.width  * pose.position[0],
      viewport.height * pose.position[1],
      0,
    );
    groupRef.current.rotation.set(
      MathUtils.degToRad(pose.rotation[0]),
      MathUtils.degToRad(pose.rotation[1]),
      MathUtils.degToRad(pose.rotation[2]),
    );
    inited.current = true;
  }, [viewport]);

  /* smooth lerp toward target every frame */
  useFrame(() => {
    const g = groupRef.current;
    if (!g || !inited.current) return;
    const sp = 0.016; // lerp speed — matches stylend's 0.015
    g.position.lerp(tgtPos.current, sp);
    g.scale.setScalar(MathUtils.lerp(g.scale.x, tgtScale.current, sp));
    g.rotation.x = MathUtils.lerp(g.rotation.x, tgtRot.current.x, sp);
    g.rotation.y = MathUtils.lerp(g.rotation.y, tgtRot.current.y, sp);
    g.rotation.z = MathUtils.lerp(g.rotation.z, tgtRot.current.z, sp);
  });

  return (
    <Float floatIntensity={0.15} rotationIntensity={0.08} speed={1.5}>
      <group ref={groupRef}>
        <primitive object={armScene} />
      </group>
    </Float>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Scene — lights + particles + arm
───────────────────────────────────────────────────────────────── */
function Scene({ scrollFrac }: { scrollFrac: number }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new Color("#020817");
  }, [scene]);

  return (
    <>
      {/* Dark blue ambient base */}
      <ambientLight color={new Color("#04122e")} intensity={2.5} />

      {/* Key — bright blue, upper-left */}
      <directionalLight color={new Color("#016BE5")} intensity={0.80} position={[-200, 180,  80]} />
      {/* Fill — softer blue, right-below */}
      <directionalLight color={new Color("#0590ff")} intensity={0.35} position={[ 280, -120, 160]} />
      {/* Rim — cyan, from front */}
      <directionalLight color={new Color("#00d4ff")} intensity={0.20} position={[   0,    0, 300]} />

      <Particles />
      <Arm scrollFrac={scrollFrac} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Exported component — fixed full-viewport background
───────────────────────────────────────────────────────────────── */
export default function WebGLBackground({ scrollFrac }: { scrollFrac: number }) {
  return (
    <div style={{
      position:      "fixed",
      top:           0,
      left:          0,
      width:         "100vw",
      height:        "100vh",
      zIndex:        0,
      pointerEvents: "none",
    }}>
      <Canvas
        gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
        dpr={[1, 2]}
        orthographic
        camera={{ near: 0.01, far: 10000, position: [0, 0, 1000] }}
      >
        <Suspense fallback={null}>
          <Scene scrollFrac={scrollFrac} />
        </Suspense>
      </Canvas>

      {/* Subtle radial blue glow at bottom — same as stylend */}
      <div style={{
        position:  "absolute",
        top:       0,
        left:      "50%",
        height:    "100vw",
        width:     "200vw",
        background:"radial-gradient(rgb(1,107,229), rgba(1,107,229,0) 70%)",
        transform: "translateX(-50%) translateY(50vh)",
        opacity:   0.35,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* preload model */
useGLTF.preload("/models/arm.glb");
