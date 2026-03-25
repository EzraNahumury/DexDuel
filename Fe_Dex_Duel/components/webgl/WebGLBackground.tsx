"use client";

import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  LineSegments,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Vector2,
  Vector3,
} from "three";

/* ─────────────────────────────────────────────────────────────────
   Particle shaders — mouse-reactive + dual color + pulsing
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
attribute float colorMix;
varying float vColorMix;
varying float vAlpha;
varying float vDist;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
void main(){
  vColorMix = colorMix;
  vec4 mp=modelMatrix*vec4(position,1.0);
  mp.x+=snoise(vec2(noise.x,uTime*speed))*scale;
  mp.y+=snoise(vec2(noise.y,uTime*speed))*scale;
  mp.z+=snoise(vec2(noise.z,uTime*speed))*scale;

  // Mouse attraction — particles drift toward cursor
  vec2 mouseWorld = uMouse * uResolution * 0.5;
  float dist = distance(mp.xy, mouseWorld);
  float attraction = smoothstep(350.0, 0.0, dist) * 40.0;
  mp.x += (mouseWorld.x - mp.x) * attraction * 0.002;
  mp.y += (mouseWorld.y - mp.y) * attraction * 0.002;

  vDist = dist;
  vAlpha = 0.6 + 0.4 * sin(uTime * speed * 3.0 + noise.x);
  // Boost alpha near mouse
  vAlpha += smoothstep(300.0, 0.0, dist) * 0.5;

  vec4 vp=viewMatrix*mp;
  gl_Position=projectionMatrix*vp;
  // Bigger particles near mouse
  float mouseScale = 1.0 + smoothstep(300.0, 0.0, dist) * 1.5;
  gl_PointSize=size*100.0*(1.0/-vp.z) * mouseScale;
}
`;

const particleFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uTime;
varying float vColorMix;
varying float vAlpha;
varying float vDist;
void main(){
  float d=distance(gl_PointCoord,vec2(0.5));
  float s=0.05/d-0.1;
  // Particles near mouse get a brighter accent color
  float mouseBlend = smoothstep(300.0, 0.0, vDist);
  vec3 baseCol = mix(uColor, uColor2, vColorMix + 0.15 * sin(uTime * 0.5));
  vec3 col = mix(baseCol, uColor3, mouseBlend * 0.6);
  gl_FragColor=vec4(col, s * vAlpha);
}
`;

/* ─────────────────────────────────────────────────────────────────
   Grid shader — mouse-reactive pulsing grid
───────────────────────────────────────────────────────────────── */
const gridVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const gridFrag = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float gridSize = 36.0;

  vec2 grid = abs(fract(uv * gridSize - 0.5) - 0.5) / fwidth(uv * gridSize);
  float line = min(grid.x, grid.y);
  float gridAlpha = 1.0 - min(line, 1.0);

  // Mouse-centered pulse wave
  vec2 mouseUv = uMouse * 0.5 + 0.5; // -1..1 to 0..1
  float mouseDist = distance(uv, mouseUv);
  float mouseWave = sin(mouseDist * 18.0 - uTime * 2.5) * 0.5 + 0.5;
  float mouseGlow = smoothstep(0.4, 0.0, mouseDist);

  // Ambient slow wave
  float dist = distance(uv, vec2(0.5));
  float wave = sin(dist * 10.0 - uTime * 0.6) * 0.5 + 0.5;

  float edgeFade = 1.0 - smoothstep(0.35, 0.55, dist);

  vec3 color = mix(vec3(0.03, 0.06, 0.18), vec3(0.05, 0.35, 0.95), (wave + mouseWave * mouseGlow) * 0.35);
  // Brighten grid near mouse
  color += vec3(0.02, 0.15, 0.4) * mouseGlow;

  float alpha = gridAlpha * (0.06 + mouseGlow * 0.12) * edgeFade * (0.5 + wave * 0.5 + mouseWave * mouseGlow * 0.8);

  gl_FragColor = vec4(color, alpha);
}
`;

/* ─────────────────────────────────────────────────────────────────
   Scroll-based pose keyframes
───────────────────────────────────────────────────────────────── */
interface Pose {
  at:       number;
  position: [number, number, number];
  scale:    number;
  rotation: [number, number, number];
}

const POSES: Pose[] = [
  { at: 0.00, position: [ 0.25, -0.80, 0], scale: 0.035, rotation: [   0,   90,    0] },
  { at: 0.18, position: [ 0.32, -0.55, 0], scale: 0.028, rotation: [ -45, -135,  -45] },
  { at: 0.36, position: [-0.12, -0.70, 0], scale: 0.024, rotation: [ -15,  -80,  -20] },
  { at: 0.54, position: [-0.20, -0.65, 0], scale: 0.030, rotation: [   0,  -14,  -16] },
  { at: 0.72, position: [ 0.15, -0.68, 0], scale: 0.025, rotation: [ -45, -135,  -45] },
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
   Mouse-reactive Particles
───────────────────────────────────────────────────────────────── */
function Particles({ mouse }: { mouse: { x: number; y: number } }) {
  const { viewport } = useThree();
  const count = 160;

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i*3]   = MathUtils.randFloatSpread(viewport.width  * 1.8);
      a[i*3+1] = MathUtils.randFloatSpread(viewport.height * 1.8);
      a[i*3+2] = MathUtils.randFloatSpread(500);
    }
    return a;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noise     = useMemo(() => Float32Array.from({length: count*3}, () => Math.random()*100), []);
  const sizes     = useMemo(() => Float32Array.from({length: count},   () => Math.random()*120+20), []);
  const speeds    = useMemo(() => Float32Array.from({length: count},   () => Math.random()*0.2+0.02), []);
  const scales    = useMemo(() => Float32Array.from({length: count},   () => Math.random()*90+10), []);
  const colorMixs = useMemo(() => Float32Array.from({length: count},   () => Math.random()), []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uColor:      { value: new Color("#10E1FF") },
    uColor2:     { value: new Color("#3b82f6") },
    uColor3:     { value: new Color("#0df280") },  // accent near mouse
    uMouse:      { value: new Vector2(0, 0) },
    uResolution: { value: new Vector2(viewport.width, viewport.height) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-noise"    args={[noise,     3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes,     1]} />
        <bufferAttribute attach="attributes-speed"    args={[speeds,    1]} />
        <bufferAttribute attach="attributes-scale"    args={[scales,    1]} />
        <bufferAttribute attach="attributes-colorMix" args={[colorMixs, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVert}
        fragmentShader={particleFrag}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mouse-reactive Animated Grid
───────────────────────────────────────────────────────────────── */
function AnimatedGrid({ mouse }: { mouse: { x: number; y: number } }) {
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
  });

  return (
    <mesh position={[0, 0, -200]}>
      <planeGeometry args={[viewport.width * 2.5, viewport.height * 2.5]} />
      <shaderMaterial
        vertexShader={gridVert}
        fragmentShader={gridFrag}
        transparent
        depthWrite={false}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Floating Wireframe Shapes — rotate + react to mouse
───────────────────────────────────────────────────────────────── */
function FloatingShape({
  position,
  rotationSpeed,
  geometry,
  color,
  scale,
  mouse,
}: {
  position: [number, number, number];
  rotationSpeed: [number, number, number];
  geometry: "octahedron" | "icosahedron" | "torus";
  color: string;
  scale: number;
  mouse: { x: number; y: number };
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    // Base rotation + mouse influence
    meshRef.current.rotation.x = t * rotationSpeed[0] + mouse.y * 0.3;
    meshRef.current.rotation.y = t * rotationSpeed[1] + mouse.x * 0.3;
    meshRef.current.rotation.z = t * rotationSpeed[2];
    // Float + mouse parallax
    meshRef.current.position.x = position[0] + mouse.x * 20;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 15 + mouse.y * 20;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      {geometry === "octahedron" && <octahedronGeometry args={[1, 0]} />}
      {geometry === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
      {geometry === "torus" && <torusGeometry args={[1, 0.3, 8, 16]} />}
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.12}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function FloatingShapes({ mouse }: { mouse: { x: number; y: number } }) {
  const { viewport } = useThree();
  const w = viewport.width;
  const h = viewport.height;

  const shapes = useMemo(() => [
    { pos: [-w*0.35, h*0.25, -100] as [number,number,number], rot: [0.15, 0.2, 0.1] as [number,number,number], geo: "octahedron" as const, color: "#3b82f6", scale: 28 },
    { pos: [w*0.4, -h*0.2, -150] as [number,number,number], rot: [-0.1, 0.15, 0.08] as [number,number,number], geo: "icosahedron" as const, color: "#10E1FF", scale: 22 },
    { pos: [-w*0.2, -h*0.35, -120] as [number,number,number], rot: [0.08, -0.12, 0.15] as [number,number,number], geo: "torus" as const, color: "#0df280", scale: 20 },
    { pos: [w*0.3, h*0.3, -180] as [number,number,number], rot: [-0.12, 0.08, -0.1] as [number,number,number], geo: "octahedron" as const, color: "#6366f1", scale: 16 },
    { pos: [-w*0.4, h*0.05, -140] as [number,number,number], rot: [0.1, -0.18, 0.05] as [number,number,number], geo: "icosahedron" as const, color: "#3b82f6", scale: 18 },
  ], [w, h]);

  return (
    <>
      {shapes.map((s, i) => (
        <FloatingShape
          key={i}
          position={s.pos}
          rotationSpeed={s.rot}
          geometry={s.geo}
          color={s.color}
          scale={s.scale}
          mouse={mouse}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Particle Connections — mouse-reactive network lines
───────────────────────────────────────────────────────────────── */
function ParticleConnections({ mouse }: { mouse: { x: number; y: number } }) {
  const { viewport } = useThree();
  const count = 45;
  const maxDist = 200;
  const linesRef = useRef<LineSegments>(null);

  const basePositions = useMemo(() => {
    const a: number[] = [];
    for (let i = 0; i < count; i++) {
      a.push(
        MathUtils.randFloatSpread(viewport.width * 1.2),
        MathUtils.randFloatSpread(viewport.height * 1.2),
        MathUtils.randFloatSpread(200) - 100,
      );
    }
    return a;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speeds = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
    })),
  []);

  const currentPositions = useRef(new Float32Array(basePositions));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const cp = currentPositions.current;
    const mx = mouse.x * viewport.width * 0.5;
    const my = mouse.y * viewport.height * 0.5;

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i*3]   + Math.sin(t * speeds[i].x + i) * 60;
      const by = basePositions[i*3+1] + Math.cos(t * speeds[i].y + i) * 60;

      // Attract toward mouse
      const dx = mx - bx;
      const dy = my - by;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const pull = Math.max(0, 1 - dist / 400) * 30;

      cp[i*3]   = bx + (dx / (dist + 1)) * pull;
      cp[i*3+1] = by + (dy / (dist + 1)) * pull;
    }

    const linePositions: number[] = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const ddx = cp[i*3] - cp[j*3];
        const ddy = cp[i*3+1] - cp[j*3+1];
        const ddz = cp[i*3+2] - cp[j*3+2];
        const dist = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
        if (dist < maxDist) {
          linePositions.push(cp[i*3], cp[i*3+1], cp[i*3+2]);
          linePositions.push(cp[j*3], cp[j*3+1], cp[j*3+2]);
        }
      }
    }

    if (linesRef.current) {
      const geo = linesRef.current.geometry;
      geo.setAttribute("position", new Float32BufferAttribute(linePositions, 3));
      geo.attributes.position.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.08}
        blending={AdditiveBlending}
      />
    </lineSegments>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mouse glow light — follows cursor in 3D space
───────────────────────────────────────────────────────────────── */
function MouseLight({ mouse }: { mouse: { x: number; y: number } }) {
  const groupRef = useRef<Group>(null);
  const { viewport } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x = mouse.x * viewport.width * 0.5;
    groupRef.current.position.y = mouse.y * viewport.height * 0.5;
    groupRef.current.position.z = 150;
  });

  return (
    <group ref={groupRef}>
      <pointLight
        color="#10E1FF"
        intensity={0.6}
        distance={600}
        decay={2}
      />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Arm material
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

  useEffect(() => {
    armScene.traverse((node: Object3D) => {
      if ((node as Mesh).isMesh) (node as Mesh).material = armMat;
    });
  }, [armScene]);

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

  useFrame(() => {
    const g = groupRef.current;
    if (!g || !inited.current) return;
    const sp = 0.016;
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
   Scene
───────────────────────────────────────────────────────────────── */
function Scene({ scrollFrac, mouse }: { scrollFrac: number; mouse: { x: number; y: number } }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new Color("#020817");
  }, [scene]);

  return (
    <>
      <ambientLight color={new Color("#04122e")} intensity={2.5} />
      <directionalLight color={new Color("#016BE5")} intensity={0.80} position={[-200, 180,  80]} />
      <directionalLight color={new Color("#0590ff")} intensity={0.35} position={[ 280, -120, 160]} />
      <directionalLight color={new Color("#00d4ff")} intensity={0.20} position={[   0,    0, 300]} />

      <MouseLight mouse={mouse} />
      <AnimatedGrid mouse={mouse} />
      <Particles mouse={mouse} />
      <ParticleConnections mouse={mouse} />
      <FloatingShapes mouse={mouse} />
      <Arm scrollFrac={scrollFrac} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Exported component
───────────────────────────────────────────────────────────────── */
export default function WebGLBackground({
  scrollFrac,
  mouse,
}: {
  scrollFrac: number;
  mouse: { x: number; y: number };
}) {
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
          <Scene scrollFrac={scrollFrac} mouse={mouse} />
        </Suspense>
      </Canvas>

      {/* Animated gradient orbs — CSS overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}>
        <div className="animate-bg-orb-1" style={{
          position: "absolute",
          top: "20%",
          left: "60%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div className="animate-bg-orb-2" style={{
          position: "absolute",
          top: "60%",
          left: "20%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,225,255,0.1) 0%, transparent 70%)",
          filter: "blur(80px)",
        }} />
        <div className="animate-bg-orb-3" style={{
          position: "absolute",
          top: "40%",
          left: "80%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,242,128,0.08) 0%, transparent 70%)",
          filter: "blur(70px)",
        }} />
      </div>

      {/* Bottom radial glow */}
      <div style={{
        position:  "absolute",
        top:       0,
        left:      "50%",
        height:    "100vw",
        width:     "200vw",
        background:"radial-gradient(rgb(1,107,229), rgba(1,107,229,0) 70%)",
        transform: "translateX(-50%) translateY(50vh)",
        opacity:   0.3,
        pointerEvents: "none",
      }} />
    </div>
  );
}

useGLTF.preload("/models/arm.glb");
