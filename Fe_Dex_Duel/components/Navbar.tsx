"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import { WalletMenu } from "./WalletMenu";
import { FaucetButton } from "./FaucetButton";
import { useUSDTBalance } from "@/hooks/useUSDTBalance";
import { useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { balance, refetch: refetchBalance } = useUSDTBalance(account?.address);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const navLinks = [
    { href: "/tournaments", label: "Tournaments", icon: "trophy" },
    { href: "/arena", label: "Create", icon: "add_circle" },
    { href: "/leaderboard", label: "Leaderboard", icon: "workspace_premium" },
    { href: "/profile", label: "My Arena", icon: "person" },
  ];

  return (
    <>
      <nav
        className="fixed top-3 left-4 right-4 z-50 rounded-2xl sm:left-6 sm:right-6 lg:left-8 lg:right-8"
        style={{
          background: "rgba(10,15,28,0.65)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.03) inset",
        }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-5">
          {/* ── Left: Logo + Nav ── */}
          <div className="flex items-center gap-5">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2.5 shrink-0">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "rgba(59,130,246,0.3)", filter: "blur(10px)" }}
                />
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1))",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: "#60a5fa", fontSize: 16 }}>
                    swords
                  </span>
                </div>
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
            </Link>

            {/* Separator */}
            <div className="hidden h-4 w-px bg-white/[0.06] lg:block" />

            {/* Desktop Nav */}
            <div className="hidden items-center gap-0.5 lg:flex">
              {navLinks.map(({ href, label, icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className="nav-link relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200"
                    style={{
                      color: active ? "#fff" : "#64748b",
                      background: active ? "rgba(255,255,255,0.07)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "#cbd5e1";
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, color: active ? "#60a5fa" : "inherit" }}
                    >
                      {icon}
                    </span>
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full"
                        style={{
                          background: "linear-gradient(90deg, transparent, #3b82f6 30%, #22d3ee 70%, transparent)",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Right: Status + Wallet ── */}
          <div className="flex items-center gap-2">
            {/* Network Badge */}
            <div
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 md:flex"
              style={{
                background: "rgba(13,242,128,0.04)",
                border: "1px solid rgba(13,242,128,0.12)",
              }}
            >
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: "#0df280" }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0df280" }}>
                OneChain
              </span>
            </div>

            {/* Balance + Faucet */}
            {account && mounted && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: "#60a5fa", fontSize: 13 }}>
                    toll
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-300">
                    {balance ? balance.formatted : "..."}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    USDT
                  </span>
                </div>
                <FaucetButton address={account.address} onSuccess={refetchBalance} />
              </div>
            )}

            {/* Wallet */}
            <div className="flex items-center">
              {account ? (
                <WalletMenu />
              ) : (
                <ConnectButton
                  connectText={
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>
                        account_balance_wallet
                      </span>
                      Connect
                    </span>
                  }
                  className="rounded-xl px-4 py-2 text-[12px] font-bold tracking-wide transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.12))",
                    color: "#e2e8f0",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                />
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all lg:hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {mobileOpen ? <X size={15} className="text-slate-400" /> : <Menu size={15} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div
            className="lg:hidden px-4 pb-4 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="mb-3 flex flex-col gap-0.5">
              {navLinks.map(({ href, label, icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition-all"
                    style={{
                      color: active ? "#fff" : "#64748b",
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: active ? "#60a5fa" : "inherit" }}
                    >
                      {icon}
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>

            {account && (
              <div
                className="flex items-center justify-between px-2 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#60a5fa" }}>
                    toll
                  </span>
                  {balance ? `${balance.formatted} USDT` : "..."}
                </div>
                <FaucetButton address={account.address} onSuccess={refetchBalance} />
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
