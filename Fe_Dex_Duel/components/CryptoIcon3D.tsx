"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

/* ── Coin colors per crypto ────────────────────────────────────── */
const COIN_PALETTE: Record<string, { body: string; rim: string; glow: string }> = {
  BTC:   { body: "#f7931a", rim: "#ffd080", glow: "rgba(247,147,26,0.35)"  },
  ETH:   { body: "#627eea", rim: "#a5b8ff", glow: "rgba(98,126,234,0.35)"  },
  SOL:   { body: "#9945ff", rim: "#c8a0ff", glow: "rgba(153,69,255,0.35)"  },
  BNB:   { body: "#f3ba2f", rim: "#ffe07a", glow: "rgba(243,186,47,0.35)"  },
  ADA:   { body: "#0052cc", rim: "#4d90ff", glow: "rgba(0,82,204,0.35)"    },
  DOT:   { body: "#e6007a", rim: "#ff80c0", glow: "rgba(230,0,122,0.35)"   },
  AVAX:  { body: "#e84142", rim: "#ff9090", glow: "rgba(232,65,66,0.35)"   },
  MATIC: { body: "#8247e5", rim: "#c0a0ff", glow: "rgba(130,71,229,0.35)"  },
  LINK:  { body: "#375bd2", rim: "#80a8ff", glow: "rgba(55,91,210,0.35)"   },
  UNI:   { body: "#ff007a", rim: "#ff80c0", glow: "rgba(255,0,122,0.35)"   },
  SUI:   { body: "#4da2ff", rim: "#a0d0ff", glow: "rgba(77,162,255,0.35)"  },
  DOGE:  { body: "#c2a633", rim: "#ffe080", glow: "rgba(194,166,51,0.35)"  },
  XRP:   { body: "#00aae4", rim: "#80ddff", glow: "rgba(0,170,228,0.35)"   },
  LTC:   { body: "#bebebe", rim: "#e8e8e8", glow: "rgba(190,190,190,0.30)" },
  ATOM:  { body: "#2e3148", rim: "#6e78bb", glow: "rgba(46,49,72,0.35)"    },
};

function fallbackPalette(symbol: string) {
  return COIN_PALETTE[symbol.toUpperCase()] ?? { body: "#3b82f6", rim: "#93c5fd", glow: "rgba(59,130,246,0.35)" };
}

/* ── 3D coin mesh ──────────────────────────────────────────────── */
function CoinMesh({ symbol }: { symbol: string }) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const rimRef  = useRef<THREE.Mesh>(null);
  const { body, rim } = fallbackPalette(symbol);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color:     new THREE.Color(body),
    metalness: 0.92,
    roughness: 0.18,
  });
  const rimMat = new THREE.MeshPhysicalMaterial({
    color:     new THREE.Color(rim),
    metalness: 1.0,
    roughness: 0.08,
  });

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (bodyRef.current) bodyRef.current.rotation.y = t * 1.1;
    if (rimRef.current)  rimRef.current.rotation.y  = t * 1.1;
  });

  return (
    <Float floatIntensity={0.28} rotationIntensity={0.06} speed={1.9}>
      <group>
        {/* Coin body — flat cylinder */}
        <mesh ref={bodyRef} material={bodyMat} castShadow>
          <cylinderGeometry args={[0.76, 0.76, 0.13, 64]} />
        </mesh>
        {/* Rim ring — thin torus */}
        <mesh ref={rimRef} material={rimMat} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.76, 0.055, 12, 64]} />
        </mesh>
      </group>
    </Float>
  );
}

/* ── Exported component ────────────────────────────────────────── */
export function CryptoIcon3D({
  symbol,
  size = 56,
  className = "",
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const { glow } = fallbackPalette(symbol);

  return (
    <div
      className={className}
      style={{
        width:  size,
        height: size,
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      {/* Soft glow behind coin */}
      <div
        style={{
          position: "absolute",
          inset: "15%",
          borderRadius: "50%",
          background: glow,
          filter: "blur(8px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 1 }}>
        <Canvas
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          camera={{ position: [0, 0, 2.8], fov: 34 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight color="#1a3a6e" intensity={1.2} />
          <directionalLight color="#016BE5" intensity={1.4} position={[-3, 2, 3]} />
          <directionalLight color="#00d4ff" intensity={0.6} position={[3, -1, 2]} />
          <pointLight color="#ffffff" intensity={0.3} position={[0, 3, 1]} />
          <Suspense fallback={null}>
            <CoinMesh symbol={symbol} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

/* ── Row of multiple coins (for chart header) ──────────────────── */
export function CryptoCoinsRow({
  symbols,
  size = 44,
  gap = 8,
  className = "",
}: {
  symbols: string[];
  size?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap }}
    >
      {symbols.map((sym) => (
        <CryptoIcon3D key={sym} symbol={sym} size={size} />
      ))}
    </div>
  );
}
