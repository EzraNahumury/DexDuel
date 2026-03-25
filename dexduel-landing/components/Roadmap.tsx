"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";

const MILESTONES = [
  {
    quarter: "Q1 2026",
    title: "Testnet Launch",
    status: "current",
    items: [
      "Prediction tournaments on live crypto assets",
      "Global leaderboard competition",
      "Cross-chain vault integration with Base",
      "Free testnet USDT via faucet",
    ],
  },
  {
    quarter: "Q2 2026",
    title: "Security & Optimization",
    status: "upcoming",
    items: [
      "Move & Solidity smart contract audits",
      "Cross-chain relayer reliability testing",
      "Gas optimization on both chains",
      "Stress testing with high concurrency",
    ],
  },
  {
    quarter: "Q3 2026",
    title: "Mainnet Deployment",
    status: "upcoming",
    items: [
      "OneChain Mainnet launch",
      "Real USDT stakes and returns",
      "Aave V3 yield generation live",
      "Production-ready lossless gaming",
    ],
  },
  {
    quarter: "Q4 2026",
    title: "Expansion & Growth",
    status: "upcoming",
    items: [
      "Stocks, forex, commodities support",
      "Multi-season competitions & rewards",
      "Social features & team-based play",
      "Mobile optimization",
    ],
  },
];

type Milestone = typeof MILESTONES[0];

function RoadmapSlide({
  titleTop,
  titleBottom,
  milestones,
  slideId,
  startIndex,
}: {
  titleTop: string;
  titleBottom: string;
  milestones: Milestone[];
  slideId: string;
  startIndex: number;
}) {
  const slideRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slideRef.current || !timelineRef.current) return;

    const nodes = timelineRef.current.querySelectorAll(".roadmap-node");

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
    );

    if (lineRef.current) {
      tl.fromTo(
        lineRef.current,
        { scaleY: 0 },
        { scaleY: 1, duration: 1.2, ease: "power2.inOut" },
        "-=0.3"
      );
    }

    tl.fromTo(
      nodes,
      { opacity: 0, x: -30 },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: "power3.out",
      },
      "-=0.8"
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={slideRef} className="pitch-slide" id={slideId}>
      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 w-full">
        <div ref={headingRef} className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-light)] mb-3 block">
            Roadmap
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {titleTop}{" "}
            <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--cyan)] bg-clip-text text-transparent">
              {titleBottom}
            </span>
          </h2>
        </div>

        <div ref={timelineRef} className="relative">
          {/* Vertical line */}
          <div
            ref={lineRef}
            className="absolute left-[23px] md:left-1/2 md:-translate-x-[1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--accent)] via-[var(--cyan)] to-[var(--accent)]/20 origin-top"
          />

          <div className="space-y-6 sm:space-y-8">
            {milestones.map((m, idx) => {
              const globalIndex = startIndex + idx;
              const isLeft = globalIndex % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`roadmap-node relative flex items-start gap-4 sm:gap-6 ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Node dot */}
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 top-1 z-10">
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-2 ${
                        m.status === "current"
                          ? "border-[var(--accent)] bg-[var(--accent)] animate-node-pulse"
                          : "border-white/20 bg-[var(--bg-primary)]"
                      }`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className={`ml-12 md:ml-0 md:w-[calc(50%-40px)] glass-card rounded-2xl p-5 sm:p-6 ${
                      isLeft ? "md:mr-auto" : "md:ml-auto"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          m.status === "current"
                            ? "bg-[var(--accent)]/20 text-[var(--accent-light)] border border-[var(--accent)]/30"
                            : "bg-white/[0.04] text-[var(--text-tertiary)] border border-white/[0.06]"
                        }`}
                      >
                        {m.quarter}
                      </span>
                      {m.status === "current" && (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                          In Progress
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2 sm:mb-3">
                      {m.title}
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {m.items.map((item, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-tertiary)]"
                        >
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={
                              m.status === "current"
                                ? "var(--accent-light)"
                                : "var(--text-tertiary)"
                            }
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Roadmap() {
  const slide1Milestones = MILESTONES.slice(0, 2);
  const slide2Milestones = MILESTONES.slice(2, 4);

  return (
    <>
      <RoadmapSlide
        titleTop="The Path"
        titleBottom="Forward"
        milestones={slide1Milestones}
        slideId="roadmap-1"
        startIndex={0}
      />
      <RoadmapSlide
        titleTop="Looking"
        titleBottom="Ahead"
        milestones={slide2Milestones}
        slideId="roadmap-2"
        startIndex={2}
      />
    </>
  );
}
