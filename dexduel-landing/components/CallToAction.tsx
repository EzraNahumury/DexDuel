"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";
import { Button } from "@/components/button";

export default function CallToAction() {
  const slideRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current || !contentRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: slideRef.current,
        start: "top 80%",
        once: true,
      },
    });

    tl.fromTo(
      glowRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }
    ).fromTo(
      contentRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      "-=0.8"
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="cta">
      {/* Background glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 60%)",
        }}
      />

      <div ref={contentRef} className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
        {/* Decorative ring */}
        <div className="relative inline-flex items-center justify-center mb-10">
          <div className="absolute w-[180px] h-[180px] rounded-full border border-[var(--accent-border)] animate-ring-glow" />
          <div className="absolute w-[140px] h-[140px] rounded-full border border-white/[0.04]" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--cyan)] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Ready to{" "}
          <span className="bg-gradient-to-r from-[var(--accent-light)] via-[var(--cyan)] to-[var(--accent)] bg-clip-text text-transparent">
            Predict & Win
          </span>
          ?
        </h2>

        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
          Join the first no-loss prediction arena. Stake, predict, and earn real yield
          rewards — your principal is always safe.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button href="https://dex-duel.vercel.app" arrow>
            Launch App
          </Button>
          <Button href="https://dex-duel-docs.vercel.app" variant="outline">
            Read Documentation
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
          {[
            { value: "300+", label: "Trading Pairs" },
            { value: "100%", label: "Principal Protected" },
            { value: "0", label: "Capital Risk" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] stat-number">
                {s.value}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1 uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
