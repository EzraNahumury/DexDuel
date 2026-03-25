"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";
import { gsap } from "@/hooks/useGsap";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    if (isFirst.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 12 },
        { y: 0, duration: 0.35, ease: "power2.out" }
      );
      isFirst.current = false;
    } else {
      gsap.fromTo(
        containerRef.current,
        { y: 10, opacity: 0.6 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [pathname]);

  return <div ref={containerRef}>{children}</div>;
}
