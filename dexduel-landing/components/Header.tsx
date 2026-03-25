"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/hooks/useGsap";
import { Link } from "@/components/link";
import { Button } from "@/components/button";

const SLIDE_COUNT = 8;

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  /* ── Entrance animation ── */
  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.2 }
    );
  }, []);

  /* ── Track active slide via IntersectionObserver ── */
  useEffect(() => {
    const slides = document.querySelectorAll(".pitch-slide");
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(slides).indexOf(entry.target as Element);
            if (idx !== -1) setActiveSlide(idx);
          }
        });
      },
      { threshold: 0.55 }
    );

    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* ── Smart Header (hide on scroll down) ── */
  useEffect(() => {
    let lastScroll = window.scrollY;
    let isHidden = false;

    const handleScroll = () => {
      if (!headerRef.current) return;
      const currentScroll = window.scrollY;

      if (currentScroll <= 50) {
        if (isHidden) {
          gsap.to(headerRef.current, { y: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          isHidden = false;
        }
      } else if (currentScroll > lastScroll) {
        if (!isHidden) {
          gsap.to(headerRef.current, { y: -100, duration: 0.3, ease: "power2.inOut", overwrite: "auto" });
          isHidden = true;
        }
      } else if (currentScroll < lastScroll) {
        if (isHidden) {
          gsap.to(headerRef.current, { y: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          isHidden = false;
        }
      }
      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-[rgba(2,8,23,0.4)] backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1))",
                border: "1px solid rgba(59,130,246,0.3)"
              }}
            >
              <span className="material-symbols-outlined" style={{ color: "#60a5fa", fontSize: "16px" }}>
                swords
              </span>
            </div>
            <span className="font-heading text-lg font-bold text-[var(--text-primary)] tracking-tight">
              DexDuel
            </span>
          </Link>

          {/* CTA */}
          <div className="hidden sm:flex items-center gap-4">
            <Button href="https://dex-duel-docs.vercel.app" variant="outline">
              Documentation
            </Button>
            <Button href="https://dex-duel.vercel.app" arrow>
              Launch App
            </Button>
          </div>
        </div>
      </header>

      {/* Slide dot navigation — right side */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-2">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const slide = document.querySelectorAll(".pitch-slide")[i];
              slide?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`slide-dot w-2 rounded-full ${activeSlide === i
                ? "active bg-[var(--accent)] h-6"
                : "bg-white/20 h-2 hover:bg-white/40"
              }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </nav>
    </>
  );
}
