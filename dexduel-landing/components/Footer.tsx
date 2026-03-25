"use client";

import { Link } from "@/components/link";

const PRODUCT_LINKS = [
  { label: "How It Works", href: "https://dex-duel-docs.vercel.app" },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Documentation", href: "https://dex-duel-docs.vercel.app" },
];

const DEV_LINKS = [
  { label: "GitHub", href: "https://github.com/EzraNahumury/DexDuel" },
  { label: "Smart Contracts", href: "#" },
  { label: "API Reference", href: "#" },
  { label: "Bug Bounty", href: "#" },
];

const COMMUNITY_LINKS = [
  { label: "Discord", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Telegram", href: "#" },
  { label: "Blog", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] py-12 px-5 sm:px-8 snap-end">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
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
              <span className="font-heading text-lg font-bold text-[var(--text-primary)]">
                DexDuel
              </span>
            </Link>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed max-w-xs">
              The no-loss price prediction arena. Predict, play, and win
              without risking your principal.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Developers
            </h4>
            <ul className="space-y-2.5">
              {DEV_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Community
            </h4>
            <ul className="space-y-2.5">
              {COMMUNITY_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            &copy; {new Date().getFullYear()} DexDuel. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
