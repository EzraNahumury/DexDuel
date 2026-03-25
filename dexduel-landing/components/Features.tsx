"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

const FEATURES = [
  {
    title: "Lossless Model",
    description:
      "Your principal is always returned — 100% guaranteed. The worst outcome is zero return, never negative. No gambling, no risk.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    accent: "var(--success)",
  },
  {
    title: "Fully On-Chain",
    description:
      "Every prediction, score, and reward is recorded on OneChain. Transparent, verifiable, and tamper-proof settlement.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    accent: "var(--accent-light)",
  },
  {
    title: "Cross-Chain Yield",
    description:
      "Game logic runs on OneChain (Move). Yield is generated on Base via Aave V3. Best of both worlds, bridged seamlessly.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3" />
        <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
        <path d="M3 16h3a2 2 0 0 1 2 2v3" />
        <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
      </svg>
    ),
    accent: "var(--cyan)",
  },
  {
    title: "Move Language Safety",
    description:
      "Resource-oriented smart contracts prevent asset duplication or accidental destruction. Safer by design than Solidity.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      </svg>
    ),
    accent: "var(--warning)",
  },
  {
    title: "Real-Time Market Data",
    description:
      "Live price feeds from Finnhub covering 300+ Binance trading pairs. Interactive candlestick charts with 5-minute resolution.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    accent: "var(--accent-light)",
  },
  {
    title: "Competitive Seasons",
    description:
      "Earn win points, streak bonuses, and early prediction rewards. Climb the global leaderboard across season-based rankings.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    accent: "var(--gold)",
  },
];

export default function Features() {
  const slideRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current || !revealRef.current || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll(".feature-card");

    /* Diamond / rhombus expand from center */
    gsap.set(revealRef.current, {
      clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
    });
    gsap.set(headingRef.current, { opacity: 0, y: 30 });
    gsap.set(cards, { opacity: 0, scale: 0.7, y: 40 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: slideRef.current,
        start: "top 85%",
        once: true,
      },
    });

    /* Diamond expand */
    tl.to(revealRef.current, {
      clipPath: "polygon(50% -50%, 150% 50%, 50% 150%, -50% 50%)",
      duration: 1,
      ease: "power3.inOut",
    });

    /* Heading */
    tl.to(
      headingRef.current,
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.5"
    );

    /* Cards cascade in with rotation */
    tl.to(
      cards,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.5,
        stagger: {
          each: 0.08,
          from: "center",
        },
        ease: "back.out(1.4)",
      },
      "-=0.3"
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="features">
      <div ref={revealRef} className="slide-reveal">
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full">
          <div ref={headingRef} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
              Features
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Built for the{" "}
              <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--cyan)] bg-clip-text text-transparent">
                Future of Gaming
              </span>
            </h2>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="feature-card glass-card rounded-2xl p-7 relative overflow-hidden border border-transparent"
              >
                <div
                  className="feature-bar absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: f.accent }}
                />
                <div
                  className="feature-bg-glow absolute top-0 left-0 right-0 h-32 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at top, ${f.accent}15 0%, transparent 70%)`,
                  }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 border"
                  style={{
                    color: f.accent,
                    borderColor: `${f.accent}30`,
                    background: `${f.accent}10`,
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2 text-[var(--text-primary)]">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
