"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const WebGLBackground = dynamic(() => import("./WebGLBackground"), { ssr: false });

export default function WebGLWrapper() {
  const [scrollFrac, setScrollFrac] = useState(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      setScrollFrac(window.scrollY / max);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track mouse position normalized to -1..1
  const onMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Smooth update loop via rAF
    let raf: number;
    const update = () => {
      setMouse((prev) => ({
        x: prev.x + (mouseRef.current.x - prev.x) * 0.05,
        y: prev.y + (mouseRef.current.y - prev.y) * 0.05,
      }));
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, [onMouseMove]);

  return <WebGLBackground scrollFrac={scrollFrac} mouse={mouse} />;
}
