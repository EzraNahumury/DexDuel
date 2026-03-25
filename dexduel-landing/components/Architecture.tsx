"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

export default function Architecture() {
  const slideRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const arrowLeftRef = useRef<HTMLDivElement>(null);
  const arrowRightRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: slideRef.current,
        start: "top 80%",
        once: true,
      },
    });

    tl.fromTo(
      headingRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
    )
      .fromTo(
        leftRef.current,
        { opacity: 0, x: -60 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" },
        "-=0.2"
      )
      .fromTo(
        arrowLeftRef.current,
        { opacity: 0, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
        "-=0.3"
      )
      .fromTo(
        centerRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.2"
      )
      .fromTo(
        arrowRightRef.current,
        { opacity: 0, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
        "-=0.3"
      )
      .fromTo(
        rightRef.current,
        { opacity: 0, x: 60 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" },
        "-=0.2"
      )
      .fromTo(
        eventsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        "-=0.3"
      );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="architecture">
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full">
        <div ref={headingRef} className="text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
            Architecture
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Cross-Chain by{" "}
            <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--cyan)] bg-clip-text text-transparent">
              Design
            </span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-lg">
            Game logic and yield generation separated across two optimized chains.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 mb-12">
          {/* OneChain */}
          <div ref={leftRef} className="glass-card rounded-2xl p-7 w-full md:w-[280px] flex-shrink-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                  <line x1="12" y1="22" x2="12" y2="15.5" />
                  <polyline points="22 8.5 12 15.5 2 8.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  OneChain
                </h3>
                <span className="text-xs text-[var(--accent-light)]">Sui VM &middot; Move</span>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-[var(--text-tertiary)]">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Game Controller
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Predictions & Scoring
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Leaderboard & Seasons
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                On-Chain Settlement
              </li>
            </ul>
          </div>

          {/* Arrow Left */}
          <div ref={arrowLeftRef} className="hidden md:flex items-center px-2 origin-left">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]" />
            <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-transparent border-l-[var(--cyan)]" />
          </div>
          {/* Mobile arrow */}
          <div ref={arrowLeftRef} className="md:hidden flex justify-center">
            <div className="w-[2px] h-8 bg-gradient-to-b from-[var(--accent)] to-[var(--cyan)]" />
          </div>

          {/* Relayer */}
          <div ref={centerRef} className="relative flex-shrink-0">
            <div className="w-[120px] h-[120px] rounded-full border-2 border-[var(--cyan)]/30 flex items-center justify-center bg-[var(--bg-primary)] animate-ring-glow relative">
              <div className="text-center">
                <svg className="mx-auto mb-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                </svg>
                <span className="text-xs font-heading font-bold text-[var(--cyan)]">
                  Relayer
                </span>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--success)] animate-node-pulse" />
          </div>

          {/* Arrow Right */}
          <div ref={arrowRightRef} className="hidden md:flex items-center px-2 origin-right">
            <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-r-[8px] border-transparent border-r-[var(--cyan)]" />
            <div className="w-16 h-[2px] bg-gradient-to-r from-[var(--cyan)] to-[var(--accent)]" />
          </div>
          {/* Mobile arrow */}
          <div className="md:hidden flex justify-center">
            <div className="w-[2px] h-8 bg-gradient-to-b from-[var(--cyan)] to-[var(--accent)]" />
          </div>

          {/* Base */}
          <div ref={rightRef} className="glass-card rounded-2xl p-7 w-full md:w-[280px] flex-shrink-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  Base
                </h3>
                <span className="text-xs text-[var(--cyan)]">EVM &middot; Solidity</span>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-[var(--text-tertiary)]">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
                Vault Contract
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
                Aave V3 Yield
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
                Principal Tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
                Prize Distribution
              </li>
            </ul>
          </div>
        </div>

        {/* Event Flow */}
        <div ref={eventsRef} className="flex flex-wrap justify-center gap-3">
          {["JoinEvent", "RefundEvent", "PrizeEvent"].map((e) => (
            <div
              key={e}
              className="px-4 py-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-glow)] text-xs font-mono text-[var(--accent-light)]"
            >
              {e}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
