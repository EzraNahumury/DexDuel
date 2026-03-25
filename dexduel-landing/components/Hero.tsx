"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/hooks/useGsap";
import { Button } from "@/components/button";

export default function Hero() {
  const slideRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineLeftRef = useRef<HTMLDivElement>(null);
  const lineRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current) return;

    const tl = gsap.timeline({ delay: 0.3 });

    /* Horizontal accent lines sweep in */
    tl.fromTo(
      [lineLeftRef.current, lineRightRef.current],
      { scaleX: 0 },
      { scaleX: 1, duration: 0.8, ease: "power3.inOut", stagger: 0.1 }
    );

    /* Badge pops */
    tl.fromTo(
      badgeRef.current,
      { opacity: 0, y: 24, scale: 0.85 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)" },
      "-=0.4"
    );

    /* Title — split words for stagger */
    if (titleRef.current) {
      const words = titleRef.current.querySelectorAll(".word");
      tl.fromTo(
        words,
        { opacity: 0, y: 50, rotateX: 40 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        },
        "-=0.3"
      );
    }

    /* Subtitle */
    tl.fromTo(
      subRef.current,
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power3.out" },
      "-=0.35"
    );

    /* CTA */
    tl.fromTo(
      ctaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
      "-=0.3"
    );

    /* Scroll indicator */
    tl.fromTo(
      scrollRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: "power2.out" },
      "-=0.1"
    );

    return () => { tl.kill(); };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="hero">
      {/* Decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] rounded-full bg-[var(--accent)] opacity-[0.02] blur-[100px] animate-orb-1" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-[var(--cyan)] opacity-[0.02] blur-[120px] animate-orb-2" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.015] blur-[150px] animate-orb-3" />
      </div>

      {/* Horizontal accent lines */}
      <div
        ref={lineLeftRef}
        className="absolute top-[38%] left-0 w-[5%] h-[1px] bg-gradient-to-r from-transparent to-[var(--accent)]/40 origin-left"
      />
      <div
        ref={lineRightRef}
        className="absolute top-[38%] right-0 w-[5%] h-[1px] bg-gradient-to-l from-transparent to-[var(--accent)]/40 origin-right"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center" style={{ perspective: "800px" }}>
        {/* Badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-glow)]">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--accent-light)] tracking-wide uppercase">
            Live on OneChain Testnet
          </span>
        </div>

        {/* Title — wrapped in spans for per-word animation */}
        <h1
          ref={titleRef}
          className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
        >
          <span className="word inline-block">The&nbsp;</span>
          <span className="word inline-block">No-Loss&nbsp;</span>
          <br className="hidden sm:block" />
          <span className="word inline-block bg-gradient-to-r from-[var(--accent-light)] via-[var(--cyan)] to-[var(--accent)] bg-clip-text text-transparent">
            Prediction&nbsp;
          </span>
          <span className="word inline-block bg-gradient-to-r from-[var(--cyan)] to-[var(--accent-light)] bg-clip-text text-transparent">
            Arena
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subRef}
          className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Predict crypto prices, compete in tournaments, and win real yield rewards
          — all without ever risking your principal. Built on OneChain.
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="https://dex-duel.vercel.app" arrow>
            Launch App
          </Button>
          <Button href="#how-it-works" variant="outline">
            How It Works
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[var(--text-tertiary)] tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 rounded-full bg-[var(--accent-light)] animate-scroll-hint" />
        </div>
      </div>
    </section>
  );
}
