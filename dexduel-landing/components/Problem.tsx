"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

const PROBLEMS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
        <path d="M17 7L7 17" />
      </svg>
    ),
    title: "Zero-Sum Models",
    description:
      "Traditional prediction markets force losers to forfeit their entire stake. One player's gain is another's total loss.",
    stat: "100%",
    statLabel: "capital at risk",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
    title: "Barrier to Entry",
    description:
      "Fear of capital loss prevents mainstream adoption. Users avoid prediction markets because the downside is too high.",
    stat: "83%",
    statLabel: "quit after first loss",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: "No Persistent Competition",
    description:
      "Fragmented GameFi with no long-term engagement systems. Players have no reason to return after a single round.",
    stat: "< 2",
    statLabel: "avg. sessions per user",
  },
];

export default function Problem() {
  const slideRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current || !revealRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll(".problem-card");

    /* Start hidden */
    gsap.set(revealRef.current, { clipPath: "circle(0% at 50% 50%)" });
    gsap.set(headingRef.current, { opacity: 0, y: 40 });
    gsap.set(cards, { opacity: 0, y: 70, rotateX: 25, scale: 0.9 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: slideRef.current,
        start: "top 85%",
        once: true,
      },
    });

    /* Circle expand reveal */
    tl.to(revealRef.current, {
      clipPath: "circle(150% at 50% 50%)",
      duration: 1.1,
      ease: "power3.inOut",
    });

    /* Heading appears mid-reveal */
    tl.to(
      headingRef.current,
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.6"
    );

    /* Cards flip in with stagger */
    tl.to(
      cards,
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
      },
      "-=0.3"
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="problem">
      <div ref={revealRef} className="slide-reveal">
        <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full">
          <div ref={headingRef} className="text-center mb-16">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
              The Problem
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Prediction Markets Are{" "}
              <span className="text-[var(--danger)]">Broken</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-lg">
              Current platforms punish participation. Players risk everything for uncertain returns.
            </p>
          </div>

          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: "1000px" }}>
            {PROBLEMS.map((p, i) => (
              <div
                key={i}
                className="problem-card glass-card rounded-2xl p-8 flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex items-center justify-center text-[var(--danger)] mb-6">
                  {p.icon}
                </div>
                <h3 className="font-heading text-xl font-semibold mb-3 text-[var(--text-primary)]">
                  {p.title}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-6 flex-1">
                  {p.description}
                </p>
                <div className="border-t border-white/[0.06] pt-5">
                  <span className="font-heading text-2xl font-bold text-[var(--danger)]">
                    {p.stat}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] ml-2 uppercase tracking-wider">
                    {p.statLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
