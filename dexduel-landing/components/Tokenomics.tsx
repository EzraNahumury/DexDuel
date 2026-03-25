"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

const DISTRIBUTION = [
  { label: "1st Place", percent: 50, color: "var(--gold)", ring: 140 },
  { label: "2nd Place", percent: 30, color: "var(--silver)", ring: 110 },
  { label: "3rd Place", percent: 20, color: "var(--bronze)", ring: 80 },
];

export default function Tokenomics() {
  const slideRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

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
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" },
        "-=0.3"
      )
      .fromTo(
        rightRef.current,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" },
        "-=0.5"
      );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="tokenomics">
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full">
        <div ref={headingRef} className="text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
            Reward Model
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Where Losing{" "}
            <span className="bg-gradient-to-r from-[var(--success)] to-[var(--cyan)] bg-clip-text text-transparent">
              Doesn&apos;t Exist
            </span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-lg">
            Prizes come from real DeFi yield — not from other players&apos; losses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — Principal guarantee */}
          <div ref={leftRef} className="space-y-6">
            {/* Big guarantee card */}
            <div className="glass-card rounded-2xl p-8 border border-[var(--success)]/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--success)]" />
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-bold text-[var(--success)] mb-1">
                    100% Principal Back
                  </h3>
                  <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                    Every participant receives their full stake back after every round.
                    Win or lose your prediction, your money is safe.
                  </p>
                </div>
              </div>
            </div>

            {/* Platform fee */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">Platform Fee</span>
                <span className="font-heading text-lg font-bold text-[var(--accent-light)]">10%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-[10%] rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]" />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Only 10% of <em>yield</em> funds operations. Never touches principal.
              </p>
            </div>

            {/* Yield source */}
            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/20 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Real Yield from Aave V3
                </span>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Sustainable rewards, not ponzi mechanics
                </p>
              </div>
            </div>
          </div>

          {/* Right — Prize distribution */}
          <div ref={rightRef} className="flex flex-col items-center">
            {/* Concentric rings */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center mb-8">
              {DISTRIBUTION.map((d, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: `${d.ring * 2}px`,
                    height: `${d.ring * 2}px`,
                    borderColor: `${d.color}40`,
                    boxShadow: `0 0 30px ${d.color}15, inset 0 0 30px ${d.color}08`,
                  }}
                />
              ))}
              {/* Center text */}
              <div className="text-center relative z-10">
                <div className="font-heading text-3xl font-bold text-[var(--text-primary)]">
                  90%
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  of yield to winners
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4">
              {DISTRIBUTION.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 glass-card rounded-xl px-4 py-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: d.color }}
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {d.percent}%
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-1.5">
                      {d.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
