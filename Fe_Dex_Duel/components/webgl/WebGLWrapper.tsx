"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const WebGLBackground = dynamic(() => import("./WebGLBackground"), { ssr: false });

export default function WebGLWrapper() {
  const [scrollFrac, setScrollFrac] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      setScrollFrac(window.scrollY / max);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <WebGLBackground scrollFrac={scrollFrac} />;
}
