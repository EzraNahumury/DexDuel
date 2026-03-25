"use client";

import Link from "next/link";
import { EXPLORER_BASE } from "@/lib/constants";
import { useTranslation, type TranslationKey } from "@/lib/i18n";

const NAV_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/tournaments", labelKey: "nav.tournaments" },
  { href: "/arena", labelKey: "nav.create" },
  { href: "/leaderboard", labelKey: "nav.leaderboard" },
  { href: "/profile", labelKey: "nav.myArena" },
];

const RESOURCES = [
  { href: EXPLORER_BASE, label: "Block Explorer", external: true },
  { href: "https://github.com", label: "GitHub", external: true },
  { href: "https://twitter.com", label: "Twitter / X", external: true },
];

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="relative z-10 mt-auto border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1))",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "#60a5fa", fontSize: 16 }}>
                  swords
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[12px] font-black uppercase italic tracking-tight text-white">DEX</span>
                <span
                  className="text-[12px] font-black uppercase italic tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #60a5fa, #22d3ee)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  DUEL
                </span>
              </div>
            </div>
            <p className="max-w-xs text-[13px] leading-relaxed text-slate-500">
              {t("footer.description")}
            </p>

            {/* Network badge */}
            <div
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{
                background: "rgba(13,242,128,0.04)",
                border: "1px solid rgba(13,242,128,0.1)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#0df280" }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0df280" }}>
                OneChain Testnet
              </span>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              {t("footer.navigate")}
            </p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(({ href, labelKey }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[13px] font-medium text-slate-500 transition-colors duration-200 hover:text-slate-300"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              {t("footer.resources")}
            </p>
            <ul className="space-y-2.5">
              {RESOURCES.map(({ href, label, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition-colors duration-200 hover:text-slate-300"
                  >
                    {label}
                    {external && (
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: "#475569" }}>
                        open_in_new
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              {t("footer.howItWorks")}
            </p>
            <ul className="space-y-2.5 text-[13px] font-medium text-slate-500">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-black text-blue-400/60">01</span>
                {t("footer.step1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-black text-blue-400/60">02</span>
                {t("footer.step2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-black text-blue-400/60">03</span>
                {t("footer.step3")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-black text-blue-400/60">04</span>
                {t("footer.step4")}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.04] py-6 sm:flex-row">
          <p className="text-[12px] text-slate-600">
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-white/[0.04] hover:text-slate-400"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-white/[0.04] hover:text-slate-400"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
