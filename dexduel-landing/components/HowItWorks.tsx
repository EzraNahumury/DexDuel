"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

const STEPS = [
  {
    number: "01",
    title: "Stake USDT",
    description: "Enter a tournament by staking USDT. Your principal is always safe — no matter the outcome.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M9 9h6M9 15h6" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Predict UP or DOWN",
    description: "Choose your prediction for any crypto asset. Will the price go UP or DOWN during the round?",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Yield Is Generated",
    description: "All pooled stakes are deployed to Aave V3 on Base to generate real DeFi yield. No ponzi mechanics.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Everyone Wins",
    description: "100% of principal returned to all players. Top 3 predictors split the yield as bonus prizes.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
        <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const slideRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current || !revealRef.current || !stepsRef.current) return;

    const steps = stepsRef.current.querySelectorAll(".step-card");

    /* Wipe-up reveal: curtain rises from bottom */
    gsap.set(revealRef.current, { clipPath: "inset(100% 0 0 0)" });
    gsap.set(headingRef.current, { opacity: 0, y: 40 });
    gsap.set(steps, { opacity: 0, y: 50, scale: 0.85 });
    if (lineRef.current) gsap.set(lineRef.current, { scaleX: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: slideRef.current,
        start: "top 85%",
        once: true,
      },
    });

    /* Curtain rise */
    tl.to(revealRef.current, {
      clipPath: "inset(0% 0 0 0)",
      duration: 0.9,
      ease: "power3.inOut",
    });

    /* Heading */
    tl.to(
      headingRef.current,
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.4"
    );

    /* Connecting line draws across */
    if (lineRef.current) {
      tl.to(
        lineRef.current,
        { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
        "-=0.2"
      );
    }

    /* Steps bounce in one-by-one */
    tl.to(
      steps,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.18,
        ease: "back.out(1.6)",
      },
      "-=0.5"
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id="how-it-works">
      <div ref={revealRef} className="slide-reveal">
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full">
          <div ref={headingRef} className="text-center mb-16">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
              How It Works
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Four Steps to{" "}
              <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--cyan)] bg-clip-text text-transparent">
                Lossless Gaming
              </span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-lg">
              A radically simple flow where losing doesn&apos;t exist.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div
              ref={lineRef}
              className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-[var(--accent)]/0 via-[var(--accent)]/40 to-[var(--accent)]/0 origin-left"
            />

            <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {STEPS.map((step, i) => (
                <div key={i} className="step-card flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-[104px] h-[104px] rounded-full border-2 border-[var(--accent-border)] flex items-center justify-center bg-[var(--bg-primary)] relative z-10 animate-ring-glow">
                      <div className="text-[var(--accent-light)]">
                        {step.icon}
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center z-20">
                      <span className="text-xs font-bold text-white">
                        {step.number}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-heading text-lg font-semibold mb-2 text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-tertiary)] leading-relaxed max-w-[240px]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
