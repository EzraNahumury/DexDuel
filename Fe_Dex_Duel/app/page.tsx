"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { CryptoIcon3D } from "@/components/CryptoIcon3D";
import {
  gsap,
  useScrollFadeUp,
  useScrollSlideLeft,
  useScrollSlideRight,
  useScrollStagger,
  useHeroTimeline,
} from "@/hooks/useGsap";
import { useTranslation } from "@/lib/i18n";

/* ─────────────────────────────────────────────────────────────────
   Parallax banner (GSAP scroll-driven, stylend-style)
───────────────────────────────────────────────────────────────── */
function ParallaxBanner({ words, accent }: { words: string[]; accent: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const row1Ref    = useRef<HTMLDivElement>(null);
  const row2Ref    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const row1    = row1Ref.current;
    const row2    = row2Ref.current;
    if (!section || !row1 || !row2) return;

    // Use native scroll event — matches stylend's no-plugin approach
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh   = window.innerHeight;
      // progress: 0 when section enters bottom, 1 when it leaves top
      const p = Math.max(0, Math.min(1, 1 - (rect.bottom / (vh + rect.height))));
      const shift = (p - 0.5) * 120; // ±60px
      gsap.set(row1, { x: -shift });
      gsap.set(row2, { x:  shift * 0.6 });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // init
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const text = words.join("  ·  ");

  return (
    <div
      ref={sectionRef}
      className="relative overflow-hidden py-5 select-none"
      style={{
        borderTop:    "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Row 1 — large accent words */}
      <div
        ref={row1Ref}
        className="whitespace-nowrap will-change-transform"
        style={{ fontSize: "clamp(3.2rem,5.5vw,5.5rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}
        aria-hidden
      >
        {[text, "  ·  " + text].map((chunk, ci) =>
          chunk.split("·").map((word, wi) => (
            <span key={`${ci}-${wi}`}>
              <span style={{ color: wi % 3 === 0 ? accent : "rgba(255,255,255,0.035)" }}>
                {word.trim()}
              </span>
              <span style={{ color: "rgba(255,255,255,0.07)", margin: "0 0.35em" }}>·</span>
            </span>
          ))
        )}
      </div>

      {/* Row 2 — smaller echo */}
      <div
        ref={row2Ref}
        className="whitespace-nowrap will-change-transform mt-0.5"
        style={{ fontSize: "clamp(1.6rem,2.8vw,2.8rem)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: "rgba(255,255,255,0.03)" }}
        aria-hidden
      >
        {text + "  ·  " + text}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Isometric Arena Graphic — animated floating blocks
───────────────────────────────────────────────────────────────── */
function ArenaGraphic() {
  return (
    <div className="relative w-full h-[440px] flex items-center justify-center select-none">
      {/* Radial background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 72% 64% at 50% 54%, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)"
      }}/>

      <svg width="440" height="350" viewBox="0 0 440 350"
        style={{ overflow: "visible", filter: "drop-shadow(0 4px 40px rgba(59,130,246,0.45))" }}>
        <defs>
          <linearGradient id="agTop" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e3a8a"/>
            <stop offset="55%" stopColor="#2563eb"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
          <linearGradient id="agLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e40af"/>
            <stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
          <linearGradient id="agRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8"/>
            <stop offset="100%" stopColor="#172554"/>
          </linearGradient>
          <filter id="agGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="agGlowLg" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="agEdge" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── GROUND PLANE ── */}
        <polygon points="220,305 55,210 220,118 385,210"
          fill="rgba(15,23,42,0.45)" stroke="rgba(59,130,246,0.32)" strokeWidth="1"/>
        <line x1="220" y1="118" x2="220" y2="305" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5"/>
        <line x1="55"  y1="210" x2="385" y2="210" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5"/>
        <line x1="137" y1="164" x2="303" y2="256" stroke="rgba(59,130,246,0.05)" strokeWidth="0.5"/>
        <line x1="303" y1="164" x2="137" y2="256" stroke="rgba(59,130,246,0.05)" strokeWidth="0.5"/>

        {/* Ground shadows — static blobs below each floating block */}
        <ellipse cx="148" cy="226" rx="43" ry="13" fill="rgba(59,130,246,0.09)"/>
        <ellipse cx="220" cy="219" rx="52" ry="15" fill="rgba(59,130,246,0.13)"/>
        <ellipse cx="292" cy="226" rx="43" ry="13" fill="rgba(59,130,246,0.09)"/>

        {/* ── LEFT BLOCK — isoFloat1 (4.1 s) ── */}
        <g style={{ animation: "isoFloat1 4.1s ease-in-out infinite" }}>
          <polygon points="108,188 153,161 198,188 153,215" fill="url(#agTop)" opacity="0.9"/>
          <polygon points="108,188 153,161 153,215 108,242" fill="url(#agLeft)" opacity="0.92"/>
          <polygon points="153,161 198,188 198,242 153,215" fill="url(#agRight)" opacity="0.92"/>
          <polyline points="108,188 153,161 198,188"
            fill="none" stroke="rgba(96,165,250,0.95)" strokeWidth="1.4" filter="url(#agEdge)"/>
          <line x1="108" y1="188" x2="108" y2="242" stroke="rgba(59,130,246,0.38)" strokeWidth="0.8"/>
          <line x1="198" y1="188" x2="198" y2="242" stroke="rgba(59,130,246,0.38)" strokeWidth="0.8"/>
          <line x1="153" y1="215" x2="153" y2="242" stroke="rgba(59,130,246,0.28)" strokeWidth="0.8"/>
          <line x1="108" y1="242" x2="153" y2="215" stroke="rgba(59,130,246,0.3)"  strokeWidth="0.8"/>
          <line x1="153" y1="215" x2="198" y2="242" stroke="rgba(59,130,246,0.3)"  strokeWidth="0.8"/>
          {/* Top face shimmer pulse */}
          <polygon points="108,188 153,161 198,188 153,215" fill="rgba(147,197,253,0.07)">
            <animate attributeName="opacity" values="0.07;0.18;0.07" dur="3.6s" repeatCount="indefinite"/>
          </polygon>
          {/* Pole */}
          <line x1="153" y1="161" x2="153" y2="115"
            stroke="rgba(96,165,250,0.55)" strokeWidth="1.2" strokeDasharray="3,4"/>
          {/* Node */}
          <circle cx="153" cy="109" r="5.5" fill="#3b82f6" filter="url(#agGlow)"/>
          <circle cx="153" cy="109" r="10" fill="rgba(59,130,246,0.25)">
            <animate attributeName="r"       values="10;20;10" dur="3.6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.25;0;0.25" dur="3.6s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ── CENTER BLOCK (tallest) — isoFloat2 (3.4 s) ── */}
        <g style={{ animation: "isoFloat2 3.4s ease-in-out infinite" }}>
          <polygon points="176,163 220,133 264,163 220,193" fill="url(#agTop)" opacity="1"/>
          <polygon points="176,163 220,133 220,195 176,225" fill="url(#agLeft)" opacity="0.96"/>
          <polygon points="220,133 264,163 264,225 220,195" fill="url(#agRight)" opacity="0.96"/>
          <polyline points="176,163 220,133 264,163"
            fill="none" stroke="rgba(147,197,253,1)" strokeWidth="1.7" filter="url(#agEdge)"/>
          <line x1="176" y1="163" x2="176" y2="225" stroke="rgba(59,130,246,0.45)" strokeWidth="0.8"/>
          <line x1="264" y1="163" x2="264" y2="225" stroke="rgba(59,130,246,0.45)" strokeWidth="0.8"/>
          <line x1="220" y1="195" x2="220" y2="225" stroke="rgba(59,130,246,0.32)" strokeWidth="0.8"/>
          <line x1="176" y1="225" x2="220" y2="195" stroke="rgba(59,130,246,0.35)" strokeWidth="0.8"/>
          <line x1="220" y1="195" x2="264" y2="225" stroke="rgba(59,130,246,0.35)" strokeWidth="0.8"/>
          {/* Top face shimmer — brighter for hero block */}
          <polygon points="176,163 220,133 264,163 220,193" fill="rgba(147,197,253,0.09)">
            <animate attributeName="opacity" values="0.09;0.24;0.09" dur="2.8s" repeatCount="indefinite"/>
          </polygon>
          <polygon points="190,168 220,147 250,168 220,189" fill="rgba(96,165,250,0.06)"/>
          {/* Pole */}
          <line x1="220" y1="133" x2="220" y2="74"
            stroke="rgba(96,165,250,0.78)" strokeWidth="1.6" strokeDasharray="4,3"/>
          {/* Large center node with double pulse */}
          <circle cx="220" cy="68" r="8" fill="#60a5fa" filter="url(#agGlowLg)"/>
          <circle cx="220" cy="68" r="14" fill="rgba(59,130,246,0.3)">
            <animate attributeName="r"       values="14;27;14" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.30;0;0.30" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="220" cy="68" r="22" fill="rgba(59,130,246,0.13)">
            <animate attributeName="r"       values="22;40;22" dur="2.5s" begin="0.55s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.13;0;0.13" dur="2.5s" begin="0.55s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ── RIGHT BLOCK — isoFloat3 (4.6 s, delay 0.8 s) ── */}
        <g style={{ animation: "isoFloat3 4.6s ease-in-out infinite 0.8s" }}>
          <polygon points="242,188 287,161 332,188 287,215" fill="url(#agTop)" opacity="0.9"/>
          <polygon points="242,188 287,161 287,215 242,242" fill="url(#agLeft)" opacity="0.92"/>
          <polygon points="287,161 332,188 332,242 287,215" fill="url(#agRight)" opacity="0.92"/>
          <polyline points="242,188 287,161 332,188"
            fill="none" stroke="rgba(96,165,250,0.95)" strokeWidth="1.4" filter="url(#agEdge)"/>
          <line x1="242" y1="188" x2="242" y2="242" stroke="rgba(59,130,246,0.38)" strokeWidth="0.8"/>
          <line x1="332" y1="188" x2="332" y2="242" stroke="rgba(59,130,246,0.38)" strokeWidth="0.8"/>
          <line x1="287" y1="215" x2="287" y2="242" stroke="rgba(59,130,246,0.28)" strokeWidth="0.8"/>
          <line x1="242" y1="242" x2="287" y2="215" stroke="rgba(59,130,246,0.3)"  strokeWidth="0.8"/>
          <line x1="287" y1="215" x2="332" y2="242" stroke="rgba(59,130,246,0.3)"  strokeWidth="0.8"/>
          <polygon points="242,188 287,161 332,188 287,215" fill="rgba(147,197,253,0.07)">
            <animate attributeName="opacity" values="0.07;0.18;0.07" dur="4.1s" begin="0.8s" repeatCount="indefinite"/>
          </polygon>
          <line x1="287" y1="161" x2="287" y2="115"
            stroke="rgba(96,165,250,0.55)" strokeWidth="1.2" strokeDasharray="3,4"/>
          <circle cx="287" cy="109" r="5.5" fill="#3b82f6" filter="url(#agGlow)"/>
          <circle cx="287" cy="109" r="10" fill="rgba(59,130,246,0.25)">
            <animate attributeName="r"       values="10;20;10" dur="4.1s" begin="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.25;0;0.25" dur="4.1s" begin="1s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ── CONNECTING LINES with flowing dash ── */}
        <line x1="198" y1="188" x2="176" y2="196"
          stroke="rgba(6,182,212,0.5)" strokeWidth="1" strokeDasharray="5,4">
          <animate attributeName="stroke-dashoffset" values="9;0;9" dur="2s" repeatCount="indefinite"/>
        </line>
        <line x1="264" y1="163" x2="242" y2="182"
          stroke="rgba(6,182,212,0.5)" strokeWidth="1" strokeDasharray="5,4">
          <animate attributeName="stroke-dashoffset" values="9;0;9" dur="2.3s" repeatCount="indefinite"/>
        </line>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Live Ticker
───────────────────────────────────────────────────────────────── */
function TickerContent() {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Value Locked</span>
        <span className="font-black text-xl" style={{ color: "#3b82f6" }}>$2,450,892.00</span>
      </div>
      <div className="w-1 h-1 rounded-full bg-slate-700" />
      <div className="flex items-center gap-3">
        <span className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Rounds</span>
        <span className="text-slate-100 font-black text-xl">14 Live</span>
      </div>
      <div className="w-1 h-1 rounded-full bg-slate-700" />
      <div className="flex items-center gap-3">
        <span className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Yield Distributed</span>
        <span className="font-black text-xl" style={{ color: "#0df280" }}>450.22 ETH</span>
      </div>
      <div className="w-1 h-1 rounded-full bg-slate-700" />
      <div className="flex items-center gap-3">
        <span className="text-slate-500 uppercase text-xs font-bold tracking-widest">OneChain Status</span>
        <span className="font-black text-xl flex items-center gap-1" style={{ color: "#0df280" }}>
          Online
          <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
        </span>
      </div>
      <div className="w-1 h-1 rounded-full bg-slate-700" />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Arena Portal
───────────────────────────────────────────────────────────────── */
function ArenaPortal() {
  const RCX = 278;
  const RCY = 228;
  const R   = 95;

  return (
    <div className="hidden lg:block relative h-[580px]">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 55% 50% at 46% 40%, rgba(59,130,246,0.14) 0%, transparent 72%)",
      }} />
      <svg className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 600 580" preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
        <defs>
          <filter id="glowDot" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={RCX} cy={RCY} r="118" fill="none" stroke="rgba(59,130,246,0.13)" strokeWidth="1" strokeDasharray="8 16">
          <animateTransform attributeName="transform" type="rotate" from={`0 ${RCX} ${RCY}`} to={`360 ${RCX} ${RCY}`} dur="22s" repeatCount="indefinite"/>
        </circle>
        <circle cx={RCX} cy={RCY} r="106" fill="none" stroke="rgba(59,130,246,0.20)" strokeWidth="1" strokeDasharray="4 12">
          <animateTransform attributeName="transform" type="rotate" from={`360 ${RCX} ${RCY}`} to={`0 ${RCX} ${RCY}`} dur="14s" repeatCount="indefinite"/>
        </circle>
        <path d="M 10,195 Q 140,170 248,218" fill="none" stroke="rgba(59,130,246,0.09)" strokeWidth="1"/>
        <path d="M 10,310 Q 120,295 248,242" fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="1"/>
        <path d="M 590,145 Q 470,195 325,218" fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="1"/>
        {/* Lines + moving dots */}
        <path id="ap-btc" d={`M ${RCX+R*0.64},${RCY-R*0.77} C 400,135 455,105 490,85`}
          fill="none" stroke="rgba(59,130,246,0.50)" strokeWidth="1.4" strokeDasharray="7,11"
          style={{ animation: "flowDash 2.4s linear infinite" }}/>
        <path id="ap-btc-m" d={`M ${RCX+R*0.64},${RCY-R*0.77} C 400,135 455,105 490,85`} fill="none" stroke="none"/>
        <circle r="3.5" fill="#3b82f6" filter="url(#glowDot)">
          <animateMotion dur="2.4s" repeatCount="indefinite"><mpath xlinkHref="#ap-btc-m"/></animateMotion>
        </circle>
        <path id="ap-eth" d={`M ${RCX+R},${RCY+R*0.08} C 435,255 465,270 490,285`}
          fill="none" stroke="rgba(6,182,212,0.45)" strokeWidth="1.4" strokeDasharray="7,11"
          style={{ animation: "flowDash 3.1s linear infinite" }}/>
        <path id="ap-eth-m" d={`M ${RCX+R},${RCY+R*0.08} C 435,255 465,270 490,285`} fill="none" stroke="none"/>
        <circle r="3.5" fill="#06b6d4" filter="url(#glowDot)">
          <animateMotion dur="3.1s" repeatCount="indefinite"><mpath xlinkHref="#ap-eth-m"/></animateMotion>
        </circle>
        <path id="ap-pool" d={`M ${RCX-R*0.77},${RCY+R*0.64} C 160,355 115,395 80,425`}
          fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth="1.4" strokeDasharray="7,11"
          style={{ animation: "flowDash 3.6s linear infinite reverse" }}/>
        <path id="ap-pool-m" d={`M ${RCX-R*0.77},${RCY+R*0.64} C 160,355 115,395 80,425`} fill="none" stroke="none"/>
        <circle r="3.5" fill="#06b6d4" filter="url(#glowDot)">
          <animateMotion dur="3.6s" repeatCount="indefinite"><mpath xlinkHref="#ap-pool-m"/></animateMotion>
        </circle>
        <path id="ap-wr" d={`M ${RCX+R*0.32},${RCY+R} C 340,390 435,440 500,468`}
          fill="none" stroke="rgba(13,242,128,0.38)" strokeWidth="1.4" strokeDasharray="7,11"
          style={{ animation: "flowDash 2.8s linear infinite" }}/>
        <path id="ap-wr-m" d={`M ${RCX+R*0.32},${RCY+R} C 340,390 435,440 500,468`} fill="none" stroke="none"/>
        <circle r="3.5" fill="#0df280" filter="url(#glowDot)">
          <animateMotion dur="2.8s" repeatCount="indefinite"><mpath xlinkHref="#ap-wr-m"/></animateMotion>
        </circle>
        <circle cx="490" cy="85"  r="5" fill="rgba(59,130,246,0.25)" stroke="rgba(59,130,246,0.6)"  strokeWidth="1"/>
        <circle cx="490" cy="285" r="5" fill="rgba(6,182,212,0.20)"  stroke="rgba(6,182,212,0.55)"  strokeWidth="1"/>
        <circle cx="80"  cy="425" r="5" fill="rgba(6,182,212,0.20)"  stroke="rgba(6,182,212,0.55)"  strokeWidth="1"/>
        <circle cx="500" cy="468" r="5" fill="rgba(13,242,128,0.18)" stroke="rgba(13,242,128,0.55)" strokeWidth="1"/>
      </svg>

      {/* Central ring */}
      <div className="absolute" style={{ top: 133, left: 183, width: 190, height: 190 }}>
        <div className="absolute inset-0 rounded-full animate-ring-glow" style={{
          border: "2px solid rgba(59,130,246,0.88)",
          background: "radial-gradient(ellipse at 35% 22%, rgba(59,130,246,0.12) 0%, transparent 65%)",
        }}>
          <div className="absolute rounded-full" style={{ inset: 18, border: "1px dashed rgba(59,130,246,0.32)" }}/>
          <div className="absolute inset-0 rounded-full" style={{
            background: "conic-gradient(from 200deg, rgba(59,130,246,0.08) 0deg, transparent 60deg, transparent 360deg)",
          }}/>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.28em" }}>DexDuel</span>
            <span style={{ fontWeight: 900, color: "#fff", fontSize: 17, letterSpacing: "0.06em", lineHeight: 1.15 }}>ARENA</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
              <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block" }}/>
              <span style={{ fontSize: 8, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.25em" }}>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node cards */}
      <div className="absolute z-20 px-3 py-2 rounded-xl flex items-center gap-2"
        style={{ top: 55, right: 10, background: "rgba(0,180,255,0.10)", border: "1px solid rgba(0,180,255,0.28)", backdropFilter: "blur(12px)" }}>
        <CryptoIcon3D symbol="BTC" size={44}/>
        <div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">BTC / USD</div>
          <div className="text-white font-black text-base leading-tight">$64,281.50</div>
          <div className="text-green-400 text-[9px] font-bold flex items-center gap-0.5">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>trending_up</span>+2.48%
          </div>
        </div>
      </div>
      <div className="absolute z-20 px-3 py-2 rounded-xl flex items-center gap-2"
        style={{ top: 255, right: 10, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.24)", backdropFilter: "blur(12px)" }}>
        <CryptoIcon3D symbol="ETH" size={44}/>
        <div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">ETH / USD</div>
          <div className="text-white font-black text-base leading-tight">$3,421.12</div>
          <div className="text-red-400 text-[9px] font-bold flex items-center gap-0.5">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>trending_down</span>-0.82%
          </div>
        </div>
      </div>
      <div className="absolute z-20 px-3 py-2 rounded-xl flex items-center gap-2"
        style={{ bottom: 108, left: 5, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.22)", backdropFilter: "blur(12px)" }}>
        <CryptoIcon3D symbol="ETH" size={44}/>
        <div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Prize Pool</div>
          <div className="text-cyan-400 font-black text-base leading-tight">1.42 ETH</div>
          <div className="text-slate-500 text-[9px]">Yield only · Safe</div>
        </div>
      </div>
      <div className="absolute z-20 px-3 py-2 rounded-xl"
        style={{ bottom: 58, right: 10, background: "rgba(13,242,128,0.07)", border: "1px solid rgba(13,242,128,0.20)", backdropFilter: "blur(12px)" }}>
        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Win Rate</div>
        <div className="font-black text-xl leading-tight" style={{ color: "#0df280" }}>68%</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const router  = useRouter();

  useEffect(() => {
    if (account) router.push("/tournaments");
  }, [account, router]);

  /* ── Hero refs for GSAP timeline ─────────────────────────────── */
  const badgeRef   = useRef<HTMLDivElement>(null);
  const line0Ref   = useRef<HTMLSpanElement>(null);
  const line1Ref   = useRef<HTMLSpanElement>(null);
  const line2Ref   = useRef<HTMLSpanElement>(null);
  const line3Ref   = useRef<HTMLSpanElement>(null);
  const paraRef    = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useHeroTimeline({
    badge:   badgeRef   as React.RefObject<HTMLElement>,
    lines:   [line0Ref, line1Ref, line2Ref, line3Ref] as React.RefObject<HTMLElement>[],
    para:    paraRef    as React.RefObject<HTMLElement>,
    buttons: buttonsRef as React.RefObject<HTMLElement>,
  });

  /* ── Scroll-reveal refs ───────────────────────────────────────── */
  // Why DexDuel
  const whyHeaderRef  = useScrollFadeUp<HTMLDivElement>();
  const whyCardsRef   = useScrollStagger<HTMLDivElement>(".why-card", { stagger: 0.07, scale: true });

  // Matters section
  const mattersLeftRef  = useScrollSlideLeft<HTMLDivElement>();
  const mattersRightRef = useScrollSlideRight<HTMLDivElement>(0.12);

  // Live Battles
  const battlesHeaderRef = useScrollFadeUp<HTMLDivElement>();
  const battlesCardsRef  = useScrollStagger<HTMLDivElement>(".battle-card", { stagger: 0.09, scale: true });

  // Arena Legends
  const legendsLeftRef  = useScrollSlideLeft<HTMLDivElement>();
  const legendsRightRef = useScrollSlideRight<HTMLDivElement>(0.1);

  // Footer
  const footerRef = useScrollFadeUp<HTMLElement>(0, { y: 16, duration: 0.45 });

  return (
    <div className="relative z-10 text-slate-100 antialiased overflow-x-hidden min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center px-6 overflow-hidden">
        <div className="absolute inset-0 blue-cyber-grid z-0" />
        <div className="absolute inset-0 z-0 pointer-events-none">
          {[
            [8,12],[22,38],[44,7],[63,22],[79,58],[14,73],[34,88],[53,48],[89,18],[4,53],
            [68,78],[46,32],[81,43],[19,63],[58,9],[37,70],[87,28],[11,36],[51,83],[77,14],
            [30,5],[55,62],[72,33],[6,45],[91,67],[42,20],[26,80],[60,55],[85,10],[17,50],
          ].map(([left, top], i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${left}%`, top: `${top}%`,
              width:  i % 5 === 0 ? "2px" : "1px",
              height: i % 5 === 0 ? "2px" : "1px",
              backgroundColor: i % 7 === 0 ? "rgba(59,130,246,0.45)" : "rgba(148,163,184,0.18)",
              animation: i % 3 === 0
                ? `dotTwinkle ${1.8 + (i % 4) * 0.55}s ease-in-out infinite ${(i % 7) * 0.3}s`
                : undefined,
            }} />
          ))}
        </div>
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full z-0 pointer-events-none"
          style={{ background: "rgba(59,130,246,0.07)", filter: "blur(120px)", animation: "blobPulse 7s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full z-0 pointer-events-none"
          style={{ background: "rgba(6,182,212,0.05)", filter: "blur(80px)", animation: "blobPulse 5s ease-in-out infinite 2s" }} />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-20 pb-32">
          {/* Left — GSAP timeline entrance */}
          <div>
            <div ref={badgeRef}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
              style={{ backgroundColor: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.28)", color: "#60a5fa" }}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{t("home.badge")}</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.05]">
              <span ref={line0Ref} style={{ display: "block" }}>{t("home.heroLine1")}</span>
              <span ref={line1Ref} style={{ display: "block" }}>{t("home.heroLine2")}</span>
              <span ref={line2Ref} style={{ display: "block" }}>
                {t("home.heroLine3")}{" "}
                <span ref={line3Ref} className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", display: "inline-block" }}>
                  DexDuel
                </span>
              </span>
            </h1>

            <p ref={paraRef} className="text-lg text-slate-400 max-w-lg mb-10 leading-relaxed">
              {t("home.heroDesc")}
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4">
              {/* Primary CTA — float + glow pulse, starts after GSAP entrance (~2.5s) */}
              <Link href="/tournaments"
                className="px-8 py-4 rounded-lg font-black text-sm uppercase tracking-wider text-center active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #0891b2)",
                  color: "#fff",
                  animation: "heroButtonFloat 3.2s ease-in-out infinite 2.5s, btnGlowPulse 2.8s ease-in-out infinite 2.2s",
                  transition: "filter 0.2s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; (e.currentTarget as HTMLElement).style.filter = "brightness(1)"; }}
              >
                {t("home.enterArena")}
              </Link>
              {/* Secondary CTA — float with offset delay */}
              <Link href="/tournaments"
                className="px-8 py-4 rounded-lg font-black text-sm uppercase tracking-wider text-center active:scale-95"
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#cbd5e1",
                  animation: "heroButtonFloat 4s ease-in-out infinite 3.1s",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {t("home.discoverHow")}
              </Link>
            </div>
          </div>

          {/* Right — Arena Portal */}
          <ArenaPortal />
        </div>

        {/* Live ticker */}
        <div className="absolute bottom-0 left-0 right-0 z-10 py-4 overflow-hidden whitespace-nowrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", backgroundColor: "rgba(2,8,23,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="flex items-center gap-12 animate-marquee">
            <TickerContent />
            <TickerContent />
          </div>
        </div>
      </section>

      {/* ── Why DexDuel? ──────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "rgba(59,130,246,0.05)", filter: "blur(100px)" }} />
        <div className="max-w-7xl mx-auto">
          <div ref={whyHeaderRef} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Why{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                {t("home.whyTitle")}
              </span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
              {t("home.whySubtitle")}
            </p>
          </div>

          <div ref={whyCardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "security",  title: t("home.zeroRisk"),       desc: t("home.zeroRiskDesc"), accent: "#3b82f6" },
              { icon: "bolt",      title: t("home.instantPayouts"), desc: t("home.instantPayoutsDesc"),              accent: "#06b6d4" },
              { icon: "bar_chart", title: t("home.transparency"),    desc: t("home.transparencyDesc"),        accent: "#a78bfa" },
              { icon: "speed",     title: t("home.efficiency"),      desc: t("home.efficiencyDesc"),                   accent: "#0df280" },
            ].map(({ icon, title, desc, accent }, i) => (
              <div key={title}
                className="why-card relative rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(8,12,28,0.96) 0%, rgba(14,24,54,0.8) 100%)",
                  border: "1px solid rgba(59,130,246,0.14)",
                  padding: "1.5rem",
                  animation: `cardFloat ${3.8 + i * 0.4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.6}s`,
                }}
              >
                {/* Ambient glow that reveals on hover */}
                <div className="why-bg-glow absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 25% 10%, ${accent}18 0%, transparent 60%)` }}/>

                {/* Top-right corner decoration */}
                <div className="absolute top-0 right-0 pointer-events-none" style={{ padding: 14 }}>
                  <div className="why-corner-h absolute"
                    style={{ top: 14, right: 14, width: 22, height: 1, background: `linear-gradient(to left, ${accent}, transparent)` }}/>
                  <div className="why-corner-v absolute"
                    style={{ top: 14, right: 14, width: 1, height: 22, background: `linear-gradient(to bottom, ${accent}, transparent)` }}/>
                </div>

                {/* Card number */}
                <div className="absolute top-3.5 right-4 font-black pointer-events-none select-none"
                  style={{ color: `${accent}30`, fontSize: 10, letterSpacing: "0.25em" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Icon with pulse ring */}
                <div className="relative inline-flex w-12 h-12 rounded-xl items-center justify-center mb-5"
                  style={{ background: `${accent}1a`, border: `1px solid ${accent}40` }}>
                  <span className="material-symbols-outlined" style={{ color: accent, fontSize: 22 }}>{icon}</span>
                  <span className="why-icon-ring absolute inset-0 rounded-xl pointer-events-none"
                    style={{ border: `1px solid ${accent}` }}/>
                </div>

                <h3 className="font-black text-lg mb-2 tracking-tight">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>

                {/* Bottom accent bar — slides in on hover */}
                <div className="why-bottom-bar absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
                  style={{ background: `linear-gradient(to right, transparent, ${accent}95, transparent)` }}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parallax Banner 1 ─────────────────────────────────────── */}
      <ParallaxBanner
        words={["Lossless", "Yield Only", "Predict & Win", "OneChain", "Zero Risk"]}
        accent="#3b82f6"
      />

      {/* ── Why DexDuel Matters ───────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="absolute left-12 top-16 select-none pointer-events-none"
          style={{ color: "rgba(59,130,246,0.2)", fontSize: "2rem", fontWeight: 100 }}>+</span>
        <span className="absolute right-16 bottom-12 select-none pointer-events-none"
          style={{ color: "rgba(59,130,246,0.2)", fontSize: "2rem", fontWeight: 100 }}>+</span>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div ref={mattersLeftRef}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Why DexDuel{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                {t("home.whyMattersTitle")}
              </span>
            </h2>
            <p className="text-slate-400 mb-10 leading-relaxed max-w-md">
              {t("home.whyMattersDesc")}
            </p>
            <Link href="/tournaments"
              className="inline-block px-8 py-4 rounded-lg font-black text-sm uppercase tracking-wider active:scale-95"
              style={{
                background: "linear-gradient(135deg, #2563eb, #0891b2)",
                color: "#fff",
                animation: "heroButtonFloat 3.4s ease-in-out infinite, btnGlowPulse 3s ease-in-out infinite 0.4s",
                transition: "filter 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; (e.currentTarget as HTMLElement).style.filter = "brightness(1)"; }}
            >
              {t("home.enterArena")}
            </Link>
          </div>
          <div ref={mattersRightRef} className="hidden lg:flex items-center justify-center">
            <ArenaGraphic />
          </div>
        </div>
      </section>

      {/* ── Parallax Banner 2 ─────────────────────────────────────── */}
      <ParallaxBanner
        words={["BTC", "ETH", "SOL", "Stake", "Predict", "Win the Yield", "Arena"]}
        accent="#06b6d4"
      />

      {/* ── Live Battles ──────────────────────────────────────────── */}
      <section className="py-28 px-6 relative max-w-7xl mx-auto">
        <div ref={battlesHeaderRef} className="flex justify-between items-end mb-12">
          <div>
            {/* overflow-visible + inline-block pr-1 prevents bg-clip-text cutting the last char */}
            <h2 className="text-3xl font-black uppercase italic tracking-tighter overflow-visible">
              Live{" "}
              <span className="text-transparent bg-clip-text inline-block pr-1"
                style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                {t("home.liveBattles")}
              </span>
            </h2>
            <p className="text-slate-500 font-medium mt-1">{t("home.liveBattlesDesc")}</p>
          </div>
          <Link href="/tournaments"
            className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
            style={{ color: "#3b82f6" }}>
            {t("home.allMarkets")}
            <span className="material-symbols-outlined leading-none">arrow_forward</span>
          </Link>
        </div>

        <div ref={battlesCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              sym: "BTC / USD", round: "48,291", price: "$64,281.50",
              accent: "#3b82f6", pool: "1.42 ETH", poolColor: "#3b82f6",
              ends: "04:12", urgent: false,
              floatDur: "3.9s", floatDelay: "0s", scanDelay: "0s",
            },
            {
              sym: "ETH / USD", round: "12,834", price: "$3,421.12",
              accent: "#ff4d4d", pool: "8.15 ETH", poolColor: "#3b82f6",
              ends: "02:45", urgent: false,
              floatDur: "4.4s", floatDelay: "0.5s", scanDelay: "2s",
            },
            {
              sym: "SOL / USD", round: "9,402", price: "$145.82",
              accent: "#06b6d4", pool: "24.5 ETH", poolColor: "#06b6d4",
              ends: "00:58", urgent: true,
              floatDur: "3.6s", floatDelay: "1s", scanDelay: "4s",
            },
          ].map(({ sym, round, price, accent, pool, poolColor, ends, urgent, floatDur, floatDelay, scanDelay }) => (
            <div key={sym}
              className="battle-card relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(8,12,28,0.97) 0%, rgba(12,20,50,0.88) 100%)",
                border: `1px solid ${accent}28`,
                borderLeft: `3px solid ${accent}`,
                padding: "1.5rem",
                animation: `cardFloat ${floatDur} ease-in-out infinite ${floatDelay}`,
                boxShadow: `0 8px 32px ${accent}0e, inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
            >
              {/* Left edge ambient glow */}
              <div className="absolute top-0 left-0 bottom-0 w-8 pointer-events-none"
                style={{ background: `linear-gradient(to right, ${accent}18, transparent)` }}/>

              {/* Scan line sweeping top → bottom */}
              <div className="absolute left-0 right-0 h-[2px] top-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, transparent, ${accent}70, transparent)`,
                  animation: `battleScan 6s ease-in-out infinite ${scanDelay}`,
                }}/>

              {/* LIVE badge */}
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full pointer-events-none"
                style={{ background: "rgba(13,242,128,0.1)", border: "1px solid rgba(13,242,128,0.22)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">Live</span>
              </div>

              {/* Header */}
              <div className="flex justify-between items-start mb-6 pr-14">
                <div>
                  <h3 className="text-xl font-black uppercase italic">{sym}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Round #{round}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black"
                    style={{ animation: "priceFlicker 8s ease-in-out infinite" }}>
                    {price}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{t("home.lockedPrice")}</p>
                </div>
              </div>

              {/* Predict buttons */}
              <div className="flex gap-3 mb-4">
                <button className="flex-1 py-4 rounded-xl flex flex-col items-center gap-1 transition-all hover:scale-[1.04] hover:brightness-110"
                  style={{ backgroundColor: "rgba(13,242,128,0.07)", border: "1px solid rgba(13,242,128,0.28)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#0df280", fontSize: 22 }}>trending_up</span>
                  <span className="font-black uppercase text-xs tracking-wider" style={{ color: "#0df280" }}>{t("home.predictUp")}</span>
                </button>
                <button className="flex-1 py-4 rounded-xl flex flex-col items-center gap-1 transition-all hover:scale-[1.04] hover:brightness-110"
                  style={{ backgroundColor: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.28)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#ff4d4d", fontSize: 22 }}>trending_down</span>
                  <span className="font-black uppercase text-xs tracking-wider" style={{ color: "#ff4d4d" }}>{t("home.predictDown")}</span>
                </button>
              </div>

              {/* Stats footer */}
              <div className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  <span>{t("home.prizePoolYield")}</span>
                  <span>{t("home.endsIn")}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-lg font-black" style={{ color: poolColor }}>{pool}</span>
                  <span className="text-lg font-black font-mono tabular-nums"
                    style={{ color: urgent ? "#ff4d4d" : "#f1f5f9", animation: urgent ? "priceFlicker 1.8s ease-in-out infinite" : undefined }}>
                    {ends}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Parallax Banner 3 ─────────────────────────────────────── */}
      <ParallaxBanner
        words={["Arena Legends", "Top Traders", "Win Rate", "Yield Champions", "Compete"]}
        accent="#3b82f6"
      />

      {/* ── Arena Legends & Community ─────────────────────────────── */}
      <section className="py-28 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

          {/* ── Left: Leaderboard card ── */}
          <div ref={legendsLeftRef} className="flex flex-col">
            <div className="rounded-2xl overflow-hidden flex flex-col flex-1"
              style={{
                background: "linear-gradient(145deg, rgba(8,12,28,0.97) 0%, rgba(12,20,50,0.88) 100%)",
                border: "1px solid rgba(59,130,246,0.18)",
                animation: "cardFloat 4.2s ease-in-out infinite",
              }}>

              {/* Card header */}
              <div className="px-6 py-5 flex items-center gap-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(59,130,246,0.12)", background: "rgba(59,130,246,0.06)" }}>
                <span className="material-symbols-outlined" style={{ color: "#3b82f6", fontSize: 22 }}>workspace_premium</span>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{t("home.arenaLegends")}</h2>
                <span className="ml-auto text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{ color: "#0df280", background: "rgba(13,242,128,0.08)", border: "1px solid rgba(13,242,128,0.2)" }}>
                  Season 1
                </span>
              </div>

              {/* Table */}
              <table className="w-full text-left">
                <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <tr>
                    {[t("common.player"), t("home.winRate"), t("home.yieldWon")].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500${i === 2 ? " text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: "01", addr: "0x7a...E921", rate: 82,  yieldWon: "12.4 ETH", medal: "#f59e0b", rowGlow: "rgba(245,158,11,0.07)"  },
                    { rank: "02", addr: "0xf1...3B2a", rate: 76,  yieldWon: "8.1 ETH",  medal: "#94a3b8", rowGlow: "rgba(148,163,184,0.05)" },
                    { rank: "03", addr: "0x98...C11d", rate: 71,  yieldWon: "5.9 ETH",  medal: "#cd7f32", rowGlow: "rgba(205,127,50,0.06)"  },
                  ].map(({ rank, addr, rate, yieldWon, medal, rowGlow }, i) => (
                    <tr key={rank}
                      className="transition-colors"
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                        animation: `legendRowIn 0.45s ease-out both`,
                        animationDelay: `${0.15 + i * 0.12}s`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowGlow)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                            style={{ background: `${medal}22`, border: `1.5px solid ${medal}55`, color: medal }}>
                            {rank}
                          </div>
                          <div>
                            <div className="font-bold text-sm tracking-tight">{addr}</div>
                            <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">{t("home.trader")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-black" style={{ color: "#3b82f6" }}>{rate}%</span>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${rate}%`,
                                background: "linear-gradient(to right, #2563eb, #06b6d4)",
                                animation: `fillBar 1.2s ease-out both`,
                                animationDelay: `${0.3 + i * 0.12}s`,
                              }}/>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-right">{yieldWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer link */}
              <div className="px-6 py-4 mt-auto shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Link href="/leaderboard"
                  className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                  style={{ color: "#3b82f6" }}>
                  {t("home.viewFullLeaderboard")}
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right: Community CTA card ── */}
          <div ref={legendsRightRef} className="flex flex-col">
            <div className="p-8 rounded-2xl relative overflow-hidden flex flex-col flex-1"
              style={{
                background: "linear-gradient(145deg, rgba(8,12,28,0.97) 0%, rgba(14,24,54,0.88) 100%)",
                border: "1px solid rgba(59,130,246,0.18)",
                animation: "cardFloat 4.8s ease-in-out infinite 0.6s",
              }}>

              {/* Ambient radial glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 80% 15%, rgba(59,130,246,0.14) 0%, transparent 60%)" }}/>
              {/* Top-left corner lines */}
              <div className="absolute top-4 left-4 pointer-events-none">
                <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 1, background: "linear-gradient(to right, #3b82f6, transparent)" }}/>
                <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 24, background: "linear-gradient(to bottom, #3b82f6, transparent)" }}/>
              </div>
              {/* Bottom-right hub icon */}
              <div className="absolute -bottom-6 -right-6 pointer-events-none select-none"
                style={{ opacity: 0.06 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "9rem", color: "#3b82f6" }}>hub</span>
              </div>

              <div className="relative z-10 flex flex-col flex-1">
                <h3 className="text-2xl font-black uppercase italic mb-3 tracking-tight">{t("home.joinCollective")}</h3>
                <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                  {t("home.joinCollectiveDesc")}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { val: "50K+", label: t("home.players"),  delay: "0.1s" },
                    { val: "98%",  label: t("home.uptime"),   delay: "0.22s" },
                    { val: "24/7", label: t("home.alerts"),   delay: "0.34s" },
                  ].map(({ val, label, delay }) => (
                    <div key={label} className="text-center p-3 rounded-xl"
                      style={{
                        background: "rgba(59,130,246,0.07)",
                        border: "1px solid rgba(59,130,246,0.16)",
                        animation: "statPop 0.5s ease-out both",
                        animationDelay: delay,
                      }}>
                      <div className="font-black text-xl leading-tight" style={{ color: "#3b82f6" }}>{val}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Activity feed */}
                <div className="rounded-xl p-4 mb-8"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-3">{t("home.recentActivity")}</div>
                  {[
                    { icon: "emoji_events", text: "0x7a...E921 won 2.1 ETH yield", color: "#f59e0b", ago: "2m ago" },
                    { icon: "trending_up",  text: "BTC round closed — UP wins",    color: "#0df280", ago: "5m ago" },
                    { icon: "group",        text: "12 new players joined today",   color: "#3b82f6", ago: "18m ago" },
                  ].map(({ icon, text, color, ago }, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5"
                      style={{
                        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                        animation: "legendRowIn 0.4s ease-out both",
                        animationDelay: `${0.4 + i * 0.1}s`,
                      }}>
                      <span className="material-symbols-outlined shrink-0" style={{ color, fontSize: 14 }}>{icon}</span>
                      <span className="text-xs text-slate-300 flex-1">{text}</span>
                      <span className="text-[9px] text-slate-600 shrink-0">{ago}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-4 mt-auto">
                  <button
                    className="flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest text-white hover:brightness-110 transition-all"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #0891b2)",
                      boxShadow: "0 0 20px rgba(59,130,246,0.35)",
                      animation: "heroButtonFloat 3.6s ease-in-out infinite, btnGlowPulse 3.2s ease-in-out infinite 0.5s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; }}
                  >
                    {t("home.joinDiscord")}
                  </button>
                  <button
                    className="flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest text-white transition-all hover:bg-white/10"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {t("home.followUs")}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer ref={footerRef} className="relative overflow-hidden"
        style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>

        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", bottom: 0, left: "15%", width: 380, height: 200, background: "rgba(59,130,246,0.07)", filter: "blur(90px)", borderRadius: "50%" }}/>
          <div style={{ position: "absolute", bottom: 0, right: "20%", width: 260, height: 160, background: "rgba(6,182,212,0.05)", filter: "blur(70px)", borderRadius: "50%" }}/>
        </div>

        {/* ── Top stat strip ── */}
        <div className="relative z-10 px-6 py-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(59,130,246,0.04)" }}>
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: "$2.45M",  label: "Total Value Locked",    icon: "account_balance_wallet", color: "#3b82f6" },
              { val: "50K+",    label: "Arena Players",          icon: "group",                 color: "#06b6d4" },
              { val: "450 ETH", label: "Yield Distributed",      icon: "trending_up",           color: "#0df280" },
              { val: "99.9%",   label: "Protocol Uptime",        icon: "shield_check",          color: "#a78bfa" },
            ].map(({ val, label, icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <span className="material-symbols-outlined" style={{ color, fontSize: 18 }}>{icon}</span>
                </div>
                <div>
                  <div className="font-black text-base leading-tight" style={{ color }}>{val}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main footer body ── */}
        <div className="relative z-10 px-6 py-14">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">

            {/* Brand col — spans 2 */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="material-symbols-outlined" style={{ color: "#3b82f6", fontSize: 28 }}>swords</span>
                <span className="text-xl font-black tracking-tighter uppercase italic">DexDuel</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs">
                The world&apos;s first lossless prediction arena. Stake, predict, and win the yield —
                your principal is always protected.
              </p>
              {/* Social buttons */}
              <div className="flex gap-3">
                {[
                  { icon: "forum",         label: "Discord",  color: "#5865f2" },
                  { icon: "alternate_email", label: "Twitter", color: "#1d9bf0" },
                  { icon: "language",       label: "Website", color: "#3b82f6" },
                ].map(({ icon, label, color }) => (
                  <button key={label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: `${color}14`, border: `1px solid ${color}30` }}
                    title={label}>
                    <span className="material-symbols-outlined" style={{ color, fontSize: 17 }}>{icon}</span>
                  </button>
                ))}
              </div>
              {/* OneChain badge */}
              <div className="inline-flex items-center gap-2 mt-6 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(13,242,128,0.06)", border: "1px solid rgba(13,242,128,0.18)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block shrink-0"/>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#0df280" }}>Built on OneChain</span>
              </div>
            </div>

            {/* Nav cols */}
            {[
              {
                title: "Product",
                links: [
                  { label: "Tournaments",   href: "/tournaments" },
                  { label: "Leaderboard",   href: "/leaderboard" },
                  { label: "My Arena",      href: "/profile" },
                  { label: "Arena Portal",  href: "/tournaments" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Documentation",     href: "#" },
                  { label: "Audit Report",       href: "#" },
                  { label: "OneChain Explorer",  href: "#" },
                  { label: "API Reference",      href: "#" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy",    href: "#" },
                  { label: "Terms of Service",  href: "#" },
                  { label: "Cookie Policy",     href: "#" },
                  { label: "Disclaimer",        href: "#" },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-5 flex items-center gap-2">
                  <div style={{ width: 16, height: 1, background: "#3b82f6" }}/>
                  {title}
                </div>
                <ul className="space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href}
                        className="text-sm text-slate-500 font-medium hover:text-blue-400 transition-colors flex items-center gap-1.5 group">
                        <span className="w-0 group-hover:w-2 h-px bg-blue-400 transition-all duration-300 shrink-0"/>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="relative z-10 px-6 py-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              © 2025 DexDuel. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              <span>v1.0.0</span>
              <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
              <span>Mainnet</span>
              <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>
                All systems operational
              </span>
            </div>
          </div>
        </div>

      </footer>

    </div>
  );
}
