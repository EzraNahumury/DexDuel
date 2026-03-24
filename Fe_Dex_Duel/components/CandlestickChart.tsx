"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { FinnhubCandles, FinnhubQuote } from "@/hooks/useMarketData";

/* ─── types ──────────────────────────────────────────────────────── */

interface CandlestickChartProps {
  candles: FinnhubCandles | undefined;
  quote: FinnhubQuote | undefined;
  symbol: string;
  isLoading?: boolean;
}

interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

/* ─── constants ──────────────────────────────────────────────────── */

/** Duration of each "live" candle in seconds */
const LIVE_CANDLE_SEC = 10;

const PRICE_W = 88;
const TIME_H  = 26;
const PAD_T   = 14;
const PAD_L   = 6;

/* ─── pure helpers (module scope, never change) ──────────────────── */

function fmtPrice(p: number): string {
  return p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(4) : p.toPrecision(4);
}

function fmtAxisTime(ts: number): string {
  const d   = new Date(ts * 1000);
  const h   = d.getHours().toString().padStart(2, "0");
  const m   = d.getMinutes().toString().padStart(2, "0");
  const day = d.getDate();
  const mon = d.toLocaleString("en", { month: "short" });
  if (h === "00" && m === "00") return `${day} ${mon}`;
  return `${h}:${m}`;
}

function fmtCountdown(secsLeft: number): string {
  const s  = Math.max(0, Math.ceil(secsLeft));
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function niceSteps(minVal: number, maxVal: number, count = 8): number[] {
  const range = maxVal - minVal;
  if (range === 0) return [minVal];
  const raw  = range / count;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice =
    raw / mag < 1.5 ? mag
    : raw / mag < 3.5 ? 2 * mag
    : raw / mag < 7.5 ? 5 * mag
    : 10 * mag;
  const start = Math.ceil(minVal / nice) * nice;
  const out: number[] = [];
  for (let v = start; v <= maxVal + nice * 0.001; v += nice)
    out.push(parseFloat(v.toFixed(10)));
  return out;
}

function buildRealCandles(data: FinnhubCandles): Candle[] {
  if (!data || data.s !== "ok" || !data.t?.length) return [];
  return data.t.map((t, i) => ({
    t, o: data.o[i], h: data.h[i], l: data.l[i], c: data.c[i],
  }));
}

function seededRng(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSyntheticCandles(q: FinnhubQuote, alignedNowSec: number): Candle[] {
  const { c, o, h, l, pc } = q;
  if (!c || c <= 0) return [];

  const COUNT    = 96;
  const interval = LIVE_CANDLE_SEC;
  const rand     = seededRng(Math.floor((pc > 0 ? pc : c) * 100));
  const base     = pc > 0 ? pc : c;

  const result: Candle[] = [];
  let prev = base;

  for (let i = 0; i < COUNT; i++) {
    const t        = alignedNowSec - (COUNT - 1 - i) * interval;
    const progress = i / (COUNT - 1);
    const mid =
      progress < 0.5
        ? base + (o - base) * (progress * 2)
        : o    + (c  - o)   * ((progress - 0.5) * 2);

    const dayRange = Math.max(Math.abs(h - l), c * 0.005);
    const noise    = (rand() - 0.5) * dayRange * 0.4;
    const open     = prev;
    const close    = Math.max(l * 0.997, Math.min(h * 1.003, mid + noise));
    const bodyTop  = Math.max(open, close);
    const bodyBot  = Math.min(open, close);
    const wick     = dayRange * (0.04 + rand() * 0.12);
    result.push({
      t,
      o: open,
      h: Math.min(h * 1.003, bodyTop + wick),
      l: Math.max(l * 0.997, bodyBot - wick),
      c: close,
    });
    prev = close;
  }
  return result;
}

/* ─── canvas draw helpers (pure, no hooks) ───────────────────────── */

function drawLivePriceBubble(
  ctx: CanvasRenderingContext2D,
  CX: number, CW: number, y: number,
  priceLabel: string,
  countdown: string,
) {
  const H = 34;
  const x = CX + CW;
  const w = PRICE_W - 2;
  ctx.fillStyle = "#00b89c";
  roundRect(ctx, x, y - H / 2, w, H, 3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Inter, ui-sans-serif, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(priceLabel, x + 5, y - H / 2 + 13);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "bold 10px Inter, ui-sans-serif, sans-serif";
  ctx.fillText(countdown, x + 5, y - H / 2 + 27);
}

function drawPriceBubble(
  ctx: CanvasRenderingContext2D,
  CX: number, CW: number, y: number,
  label: string,
  fill: string, strokeColor: string, textColor: string,
) {
  const H = 18;
  ctx.fillStyle = fill;
  ctx.fillRect(CX + CW, y - H / 2, PRICE_W - 2, H);
  if (strokeColor !== "none") {
    ctx.strokeStyle = strokeColor; ctx.lineWidth = 1;
    ctx.strokeRect(CX + CW, y - H / 2, PRICE_W - 2, H);
  }
  ctx.fillStyle = textColor;
  ctx.font = "bold 11px Inter, ui-sans-serif, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, CX + CW + 5, y + 4);
}

function drawTimeBubble(
  ctx: CanvasRenderingContext2D,
  x: number, bottomY: number, label: string
) {
  const W = 56; const H = 18;
  ctx.fillStyle = "#2d3550";
  ctx.fillRect(x - W / 2, bottomY + 4, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
  ctx.strokeRect(x - W / 2, bottomY + 4, W, H);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 10px Inter, ui-sans-serif, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, bottomY + 14);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─── component ──────────────────────────────────────────────────── */

export function CandlestickChart({
  candles,
  quote,
  symbol,
  isLoading,
}: CandlestickChartProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── state ─────────────────────────────────────────────────────── */
  const [size, setSize]                 = useState({ width: 700, height: 340 });
  const [visibleCount, setVisibleCount] = useState(60);
  const [panOffset, setPanOffset]       = useState(0);
  const [crosshair, setCrosshair]       = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging]     = useState(false);

  /* ── refs (set via useLayoutEffect, never during render) ────────── */
  const dragRef       = useRef<{ startX: number; startPan: number } | null>(null);
  const isHoveredRef  = useRef(false);
  const totalRef      = useRef(0);

  /* Refs that the rAF draw loop reads every frame */
  const viewDataRef   = useRef<Candle[]>([]);
  const livePriceRef  = useRef<number | null>(null);
  const crosshairRef  = useRef<{ x: number; y: number } | null>(null);
  const sizeRef       = useRef({ width: 700, height: 340 });
  const isLoadingRef  = useRef<boolean | undefined>(false);
  const symbolRef     = useRef(symbol);
  const secsLeftRef   = useRef(LIVE_CANDLE_SEC);
  const safeVisibleRef = useRef(60);
  const maxPanRef     = useRef(0);

  /* ── 1-second ticker ──────────────────────────────────────────────
   * Forces a re-render every second.
   * tickMs is used inside useMemo (not Date.now() directly).         */
  const [tickMs, setTickMs] = useState(0); // 0 = SSR-safe initial value
  useEffect(() => {
    setTickMs(Date.now()); // hydrate after mount
    const id = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── countdown ─────────────────────────────────────────────────── */
  const secsLeft = tickMs > 0
    ? LIVE_CANDLE_SEC - ((tickMs / 1000) % LIVE_CANDLE_SEC)
    : LIVE_CANDLE_SEC;
  const countdown = fmtCountdown(secsLeft);

  /* ── stable base candles ──────────────────────────────────────────
   * Regenerate only when the shape fields (pc/o/h/l) or the candle
   * period boundary changes. NOT when live price (c) changes.        */
  const candlePeriodId = tickMs > 0 ? Math.floor(tickMs / 1000 / LIVE_CANDLE_SEC) : 0;
  const alignedNowSec  = candlePeriodId * LIVE_CANDLE_SEC;
  const quoteShapeKey  = quote
    ? `${quote.pc}|${quote.o}|${quote.h}|${quote.l}|${candlePeriodId}`
    : `${candlePeriodId}`;

  const baseCandles = useMemo<Candle[]>(
    () => {
      const real = candles ? buildRealCandles(candles) : [];
      if (real.length >= 2) return real;
      if (quote && quote.c > 0) return buildSyntheticCandles(quote, alignedNowSec);
      return [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candles, quoteShapeKey]
  );

  /* ── live-patched candle ──────────────────────────────────────────
   * Last candle's close = livePrice, rebuilt every tick.             */
  const livePrice = quote?.c ?? null;
  const candleData = useMemo<Candle[]>(() => {
    if (!baseCandles.length || livePrice === null) return baseCandles;
    const copy = [...baseCandles];
    const last = { ...copy[copy.length - 1] };
    last.c = livePrice;
    last.h = Math.max(last.h, livePrice);
    last.l = Math.min(last.l, livePrice);
    copy[copy.length - 1] = last;
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCandles, livePrice, tickMs]);

  const isSynthetic = useMemo(() => {
    const real = candles ? buildRealCandles(candles) : [];
    return real.length < 2 && (quote?.c ?? 0) > 0;
  }, [candles, quote?.c]);

  /* ── viewport ────────────────────────────────────────────────────── */
  const total       = candleData.length;
  const safeVisible = Math.max(6, Math.min(visibleCount, total));
  const maxPan      = Math.max(0, total - safeVisible);
  const safePan     = Math.max(0, Math.min(panOffset, maxPan));
  const viewData    = candleData.slice(
    Math.max(0, total - safeVisible - safePan),
    total - safePan
  );

  /* ── sync refs after render (useLayoutEffect = before paint) ──────
   * React Compiler requires refs to be updated in effects, not during
   * the render phase. useLayoutEffect runs synchronously after every
   * render so the rAF loop always reads the freshest values.          */
  useLayoutEffect(() => {
    viewDataRef.current    = viewData;
    livePriceRef.current   = livePrice;
    crosshairRef.current   = crosshair;
    sizeRef.current        = size;
    isLoadingRef.current   = isLoading;
    symbolRef.current      = symbol;
    secsLeftRef.current    = secsLeft;
    safeVisibleRef.current = safeVisible;
    maxPanRef.current      = maxPan;
    totalRef.current       = total;
  });

  /* ── resize observer ─────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── native wheel listener ───────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      if (!isHoveredRef.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setVisibleCount((prev) => {
        const next = Math.round(prev * (delta > 0 ? 1.12 : 0.88));
        return Math.max(6, Math.min(next, totalRef.current || prev));
      });
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  /* ── drawFrame ───────────────────────────────────────────────────── */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr    = window.devicePixelRatio || 1;
    const { width, height } = sizeRef.current;
    const W = Math.round(width  * dpr);
    const H = Math.round(height * dpr);

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W; canvas.height  = H;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const vd      = viewDataRef.current;
    const lp      = livePriceRef.current;
    const ch      = crosshairRef.current;
    const sym     = symbolRef.current;
    const loading = isLoadingRef.current;
    const cd      = fmtCountdown(secsLeftRef.current);

    const CW = width  - PRICE_W - PAD_L;
    const CH = height - TIME_H  - PAD_T;
    const CX = PAD_L;
    const CY = PAD_T;

    /* ── backgrounds ── */
    ctx.fillStyle = "#131722";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#161b2b";
    ctx.fillRect(CX, CY, CW, CH);

    if (!vd.length) {
      ctx.fillStyle = "#4a5568"; ctx.font = "13px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(loading ? "Loading chart data…" : "No data yet", CX + CW / 2, CY + CH / 2);
      ctx.fillStyle = "#1a1f2e"; ctx.fillRect(CX + CW, CY, PRICE_W, CH + TIME_H);
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.strokeRect(CX, CY, CW, CH);
      ctx.font = "bold 15px Inter, ui-sans-serif, sans-serif"; ctx.fillStyle = "#26a69a"; ctx.textAlign = "left";
      ctx.fillText(`Finnhub · ${sym}`, CX + 10, CY + CH - 14);
      return;
    }

    /* ── price range ── */
    let pMin = Math.min(...vd.map((c) => c.l));
    let pMax = Math.max(...vd.map((c) => c.h));
    if (lp !== null) { pMin = Math.min(pMin, lp); pMax = Math.max(pMax, lp); }
    const padY = (pMax - pMin) * 0.07;
    pMin -= padY; pMax += padY;
    const pRange = pMax - pMin;
    const toY  = (p: number) => CY + CH - ((p - pMin) / pRange) * CH;
    const toX  = (i: number) => CX + (i / vd.length) * CW;
    const slotW   = CW / vd.length;
    const candleW = Math.max(1.5, slotW * 0.65);

    /* ── grid ── */
    const steps = niceSteps(pMin, pMax, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    for (const s of steps) {
      const y = toY(s);
      if (y < CY || y > CY + CH) continue;
      ctx.beginPath(); ctx.moveTo(CX, y); ctx.lineTo(CX + CW, y); ctx.stroke();
    }

    /* ── candles ── */
    for (let i = 0; i < vd.length; i++) {
      const c     = vd[i];
      const x     = toX(i) + slotW / 2;
      const bull   = c.c >= c.o;
      const color  = bull ? "#26a69a" : "#ef5350";
      const bTop   = toY(Math.max(c.o, c.c));
      const bBot   = toY(Math.min(c.o, c.c));
      const bH     = Math.max(1, bBot - bTop);
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, toY(c.h)); ctx.lineTo(x, toY(c.l)); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bTop, candleW, bH);
    }

    /* ── live price dashed line ── */
    if (lp !== null) {
      const ly = toY(lp);
      if (ly >= CY && ly <= CY + CH) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "rgba(0,229,255,0.6)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CX, ly); ctx.lineTo(CX + CW, ly); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* ── crosshair ── */
    if (ch && ch.x >= CX && ch.x <= CX + CW && ch.y >= CY && ch.y <= CY + CH) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX, ch.y); ctx.lineTo(CX + CW, ch.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ch.x, CY);  ctx.lineTo(ch.x, CY + CH); ctx.stroke();
      ctx.setLineDash([]);
      const idx = Math.min(vd.length - 1, Math.floor(((ch.x - CX) / CW) * vd.length));
      drawTimeBubble(ctx, ch.x, CY + CH, fmtAxisTime(vd[idx]?.t ?? 0));
    }

    /* ── time axis ── */
    ctx.fillStyle = "#1a1f2e"; ctx.fillRect(CX, CY + CH, CW, TIME_H);
    const maxTicks = Math.floor(CW / 72);
    const tickStep = Math.max(1, Math.floor(vd.length / maxTicks));
    ctx.font = "11px Inter, ui-sans-serif, sans-serif";
    ctx.fillStyle = "#555f7a"; ctx.textAlign = "center";
    for (let i = 0; i < vd.length; i += tickStep) {
      ctx.fillText(fmtAxisTime(vd[i].t), toX(i) + slotW / 2, CY + CH + 17);
    }

    /* ── price axis ── */
    ctx.fillStyle = "#1a1f2e"; ctx.fillRect(CX + CW, CY, PRICE_W, CH + TIME_H);
    ctx.font = "11px Inter, ui-sans-serif, sans-serif"; ctx.textAlign = "left";
    for (const s of steps) {
      const y = toY(s);
      if (y < CY || y > CY + CH) continue;
      ctx.fillStyle = "#555f7a";
      ctx.fillText(fmtPrice(s), CX + CW + 6, y + 4);
    }

    /* ── live price bubble with countdown ── */
    if (lp !== null) {
      const ly = toY(lp);
      if (ly >= CY && ly <= CY + CH)
        drawLivePriceBubble(ctx, CX, CW, ly, fmtPrice(lp), cd);
    }

    /* ── crosshair price bubble ── */
    if (ch && ch.x >= CX && ch.x <= CX + CW && ch.y >= CY && ch.y <= CY + CH) {
      const chPrice = pMax - ((ch.y - CY) / CH) * pRange;
      drawPriceBubble(ctx, CX, CW, ch.y, fmtPrice(chPrice), "#2d3550", "rgba(255,255,255,0.3)", "#e2e8f0");
    }

    /* ── border ── */
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    ctx.strokeRect(CX, CY, CW, CH);

    /* ── watermark ── */
    ctx.font = "bold 15px Inter, ui-sans-serif, sans-serif";
    ctx.fillStyle = "#26a69a"; ctx.textAlign = "left";
    ctx.fillText(`Finnhub · ${sym}`, CX + 10, CY + CH - 14);
  }, []); // stable — only reads refs

  /* ── rAF loop ────────────────────────────────────────────────────── */
  useEffect(() => {
    let rafId: number;
    const loop = () => { drawFrame(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame]);

  /* ── mouse events ────────────────────────────────────────────────── */
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      dragRef.current = { startX: e.clientX, startPan: panOffset };
      setIsDragging(true);
    },
    [panOffset]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setCrosshair({ x: mx, y: my });

      if (dragRef.current) {
        const CW    = sizeRef.current.width - PRICE_W - PAD_L;
        const slotW = CW / safeVisibleRef.current;
        const delta = Math.round(-(e.clientX - dragRef.current.startX) / slotW);
        setPanOffset(Math.max(0, Math.min(dragRef.current.startPan + delta, maxPanRef.current)));
      }
    },
    [] // reads only refs
  );

  const onMouseUp    = useCallback(() => { dragRef.current = null; setIsDragging(false); }, []);
  const onMouseEnter = useCallback(() => { isHoveredRef.current = true; }, []);
  const onMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    dragRef.current = null;
    setIsDragging(false);
    setCrosshair(null);
  }, []);

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height: 340, background: "#131722", borderRadius: 4 }}
    >
      {/* Simulated badge */}
      {isSynthetic && (
        <div
          className="absolute top-1.5 left-2 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded pointer-events-none"
          style={{
            color: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          Simulated · {LIVE_CANDLE_SEC}s candles
        </div>
      )}

      {/* Top-right countdown chip */}
      {livePrice !== null && tickMs > 0 && (
        <div
          className="absolute top-1.5 right-1 z-10 font-mono font-bold text-[10px] px-2 py-0.5 rounded pointer-events-none"
          style={{
            color: "#00e5ff",
            backgroundColor: "rgba(0,229,255,0.07)",
            border: "1px solid rgba(0,229,255,0.2)",
          }}
        >
          {countdown}
        </div>
      )}

      {/* Hint */}
      <div className="absolute bottom-7 right-24 z-10 text-[9px] text-slate-600 pointer-events-none font-mono">
        scroll = zoom · drag = pan
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: "block", cursor: isDragging ? "grabbing" : "crosshair" }}
        onMouseEnter={onMouseEnter}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
    </div>
  );
}
