"use client";

/**
 * GSAP animation hooks — matches stylend-fe animation style:
 *   power3.out easing · short durations · small y/x deltas · IntersectionObserver for scroll-reveal
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export { gsap };

/* ─── Shared observer options ─────────────────────────────────── */
const OBS_OPTS: IntersectionObserverInit = {
  threshold:  0.08,
  rootMargin: "-55px 0px",
};

/* ─── Fade-up on scroll ───────────────────────────────────────── */
export function useScrollFadeUp<T extends HTMLElement>(
  delay = 0,
  opts?: { y?: number; duration?: number }
) {
  const ref     = useRef<T>(null);
  const played  = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, y: opts?.y ?? 24 });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          gsap.to(el, {
            opacity:  1,
            y:        0,
            duration: opts?.duration ?? 0.55,
            delay,
            ease:     "power3.out",
          });
          observer.unobserve(el);
        }
      });
    }, OBS_OPTS);

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, opts?.y, opts?.duration]);

  return ref;
}

/* ─── Slide in from left on scroll ───────────────────────────── */
export function useScrollSlideLeft<T extends HTMLElement>(delay = 0) {
  const ref    = useRef<T>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, x: -38 });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          gsap.to(el, { opacity: 1, x: 0, duration: 0.65, delay, ease: "power3.out" });
          observer.unobserve(el);
        }
      });
    }, OBS_OPTS);

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return ref;
}

/* ─── Slide in from right on scroll ──────────────────────────── */
export function useScrollSlideRight<T extends HTMLElement>(delay = 0) {
  const ref    = useRef<T>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, x: 38 });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          gsap.to(el, { opacity: 1, x: 0, duration: 0.65, delay, ease: "power3.out" });
          observer.unobserve(el);
        }
      });
    }, OBS_OPTS);

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return ref;
}

/* ─── Stagger children on scroll ─────────────────────────────── */
export function useScrollStagger<T extends HTMLElement>(
  childSelector: string,
  opts?: { stagger?: number; y?: number; duration?: number; delay?: number; scale?: boolean }
) {
  const ref    = useRef<T>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          const items = el.querySelectorAll(childSelector);
          if (!items.length) return;

          const from: gsap.TweenVars = { opacity: 0, y: opts?.y ?? 22 };
          const to: gsap.TweenVars   = {
            opacity:  1,
            y:        0,
            duration: opts?.duration ?? 0.52,
            stagger:  opts?.stagger  ?? 0.07,
            delay:    opts?.delay    ?? 0,
            ease:     "power3.out",
          };
          if (opts?.scale) {
            from.scale = 0.96;
            to.scale   = 1;
          }

          gsap.fromTo(items, from, to);
          observer.unobserve(el);
        }
      });
    }, { ...OBS_OPTS, rootMargin: "-30px 0px" });

    observer.observe(el);
    return () => observer.disconnect();
  }, [childSelector, opts?.stagger, opts?.y, opts?.duration, opts?.delay, opts?.scale]);

  return ref;
}

/* ─── Row stagger (table rows) ───────────────────────────────── */
export function useScrollRowStagger<T extends HTMLElement>(
  rowSelector: string,
  delay = 0.1
) {
  const ref    = useRef<T>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          const rows = el.querySelectorAll(rowSelector);
          if (!rows.length) return;
          gsap.fromTo(
            rows,
            { opacity: 0, x: -14 },
            { opacity: 1, x: 0, duration: 0.38, stagger: 0.045, delay, ease: "power2.out" }
          );
          observer.unobserve(el);
        }
      });
    }, OBS_OPTS);

    observer.observe(el);
    return () => observer.disconnect();
  }, [rowSelector, delay]);

  return ref;
}

/* ─── Hero timeline (mount, not scroll) ──────────────────────── */
export function useHeroTimeline(refs: {
  badge:    React.RefObject<HTMLElement | null>;
  lines:    React.RefObject<HTMLElement | null>[];
  para:     React.RefObject<HTMLElement | null>;
  buttons:  React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.05 });

    if (refs.badge.current) {
      gsap.set(refs.badge.current, { opacity: 0, y: -12 });
      tl.to(refs.badge.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
    }

    refs.lines.forEach((lineRef, i) => {
      if (!lineRef.current) return;
      gsap.set(lineRef.current, { opacity: 0, y: 32 });
      tl.to(
        lineRef.current,
        { opacity: 1, y: 0, duration: 0.58, ease: "power3.out" },
        i === 0 ? "-=0.15" : "-=0.35"
      );
    });

    if (refs.para.current) {
      gsap.set(refs.para.current, { opacity: 0, y: 20 });
      tl.to(refs.para.current, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.3");
    }

    if (refs.buttons.current) {
      gsap.set(refs.buttons.current, { opacity: 0, y: 16 });
      tl.to(refs.buttons.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "-=0.25");
    }

    return () => { tl.kill(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
