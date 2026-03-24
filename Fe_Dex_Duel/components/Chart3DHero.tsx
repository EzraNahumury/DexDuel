"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Group } from "three";

/* ── Candlestick data ─────────────────────────────────────────── */
const CANDLES = [
  { open: 0.35, close: 0.72, high: 0.88, low: 0.20 }, // green
  { open: 0.68, close: 0.28, high: 0.78, low: 0.14 }, // red
  { open: 0.30, close: 0.58, high: 0.72, low: 0.12 }, // green
  { open: 0.55, close: 0.22, high: 0.68, low: 0.10 }, // red
  { open: 0.22, close: 0.06, high: 0.35, low: 0.04 }, // red
  { open: 0.10, close: 0.65, high: 0.80, low: 0.06 }, // green
  { open: 0.60, close: 0.18, high: 0.72, low: 0.10 }, // red
  { open: 0.20, close: 0.75, high: 0.90, low: 0.14 }, // green
  { open: 0.58, close: 0.30, high: 0.70, low: 0.22 }, // red (small)
  { open: 0.32, close: 0.82, high: 0.96, low: 0.28 }, // green (tall)
];

/* ── Single candle ────────────────────────────────────────────── */
function Candle({
  open, close, high, low, index,
}: {
  open: number; close: number; high: number; low: number; index: number;
}) {
  const bullish   = close > open;
  const color     = bullish ? "#22c55e" : "#ef4444";
  const emissive  = bullish ? "#166534" : "#7f1d1d";

  const bodyMin   = Math.min(open, close);
  const bodyMax   = Math.max(open, close);
  const bodyH     = Math.max(bodyMax - bodyMin, 0.04) * 3.2;
  const bodyY     = ((bodyMin + bodyMax) / 2) * 3.2 - 1.6;

  const wickH     = (high - low) * 3.2;
  const wickY     = ((high + low) / 2) * 3.2 - 1.6;

  const spacing   = 0.78;
  const x         = (index - (CANDLES.length - 1) / 2) * spacing;

  return (
    <group position={[x, 0, 0]}>
      {/* Wick */}
      <mesh position={[0, wickY, 0]}>
        <cylinderGeometry args={[0.04, 0.04, wickH, 8]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Body */}
      <mesh position={[0, bodyY, 0]}>
        <boxGeometry args={[0.44, bodyH, 0.44]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.25} roughness={0.35} metalness={0.15} />
      </mesh>
    </group>
  );
}

/* ── Scene ────────────────────────────────────────────────────── */
function Scene() {
  const groupRef = useRef<Group>(null);

  // Slow auto-rotate for a nice 3D effect
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.22 - 0.15;
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      {/* Main warm-white key */}
      <directionalLight position={[6, 8, 6]}  intensity={1.1} color="#ffffff" />
      {/* Blue rim matching site theme */}
      <directionalLight position={[-5, 4, -3]} intensity={0.55} color="#3b82f6" />
      {/* Subtle cyan fill */}
      <directionalLight position={[0, -4, 6]} intensity={0.25} color="#06b6d4" />

      <group ref={groupRef}>
        {CANDLES.map((c, i) => (
          <Candle key={i} {...c} index={i} />
        ))}
      </group>
    </>
  );
}

/* ── Export ───────────────────────────────────────────────────── */
export default function Chart3DHero() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.4, 7.5], fov: 42 }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
