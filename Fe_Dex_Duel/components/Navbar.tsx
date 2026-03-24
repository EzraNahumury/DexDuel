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
    { href: "/tournaments", label: "Tournaments",  icon: "trophy" },
    { href: "/arena",       label: "Create",        icon: "add_circle" },
    { href: "/leaderboard", label: "Leaderboard",  icon: "workspace_premium" },
    { href: "/profile",     label: "My Arena",     icon: "person" },
  ];

  return (
    <>
      {/* Top accent gradient line */}
      <div
        className="fixed top-0 left-3 right-3 sm:left-6 sm:right-6 z-50 h-[2px] rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(59,130,246,0) 10%, rgba(59,130,246,0.92) 35%, rgba(34,211,238,0.92) 65%, rgba(6,182,212,0) 90%, transparent 100%)",
        }}
      />

      <nav
        className="fixed top-2 left-3 right-3 sm:left-6 sm:right-6 z-50 backdrop-blur-2xl rounded-2xl"
        style={{
          background:
            "linear-gradient(120deg, rgba(2,8,23,0.94), rgba(15,23,42,0.9) 65%, rgba(14,28,52,0.92))",
          border: "1px solid rgba(56,189,248,0.2)",
          boxShadow:
            "0 18px 40px rgba(2,8,23,0.45), inset 0 1px 0 rgba(148,163,184,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* ── Left: Logo + nav links ── */}
          <div className="flex items-center gap-6">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                {/* Hover glow behind box */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "rgba(59,130,246,0.35)", filter: "blur(10px)" }}
                />
                <div
                  className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(8,145,178,0.2))",
                    border: "1px solid rgba(59,130,246,0.45)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: "#60a5fa", fontSize: 17 }}>
                    swords
                  </span>
                </div>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[13px] font-black tracking-tighter uppercase italic text-white leading-tight">
                  DEX
                </span>
                <span
                  className="text-[13px] font-black tracking-tighter uppercase italic leading-tight"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  DUEL
                </span>
              </div>
            </Link>

            {/* Divider */}
            <div className="hidden lg:block h-5 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ href, label, icon }) => {
                const active =
                  pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200"
                    style={
                      active
                        ? {
                            color: "#fff",
                            background:
                              "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.12))",
                            border: "1px solid rgba(59,130,246,0.34)",
                          }
                        : {
                            color: "#94a3b8",
                            border: "1px solid transparent",
                          }
                    }
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
                        (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.12)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, color: active ? "#3b82f6" : "inherit" }}
                    >
                      {icon}
                    </span>
                    {label}
                    {/* Active underline glow */}
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-px rounded-full pointer-events-none"
                        style={{
                          background: "linear-gradient(to right, transparent, #3b82f6, #06b6d4, transparent)",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Right: network + balance + wallet + mobile toggle ── */}
          <div className="flex items-center gap-2">

            {/* OneChain live badge */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0"
              style={{
                background: "rgba(13,242,128,0.06)",
                border: "1px solid rgba(13,242,128,0.18)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0 animate-pulse"
                style={{ backgroundColor: "#0df280" }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: "#0df280" }}
              >
                OneChain
              </span>
            </div>

            {/* Balance + faucet (only when connected) */}
            {account && mounted && (
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "#3b82f6", fontSize: 13 }}
                  >
                    toll
                  </span>
                  <span className="text-[11px] font-black text-slate-300">
                    {balance ? balance.formatted : "..."}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                    USDT
                  </span>
                </div>
                <FaucetButton address={account.address} onSuccess={refetchBalance} />
              </div>
            )}

            {/* Wallet connect / menu */}
            <div className="flex items-center">
              {account ? (
                <WalletMenu />
              ) : (
                <ConnectButton
                  connectText={
                    <span className="flex items-center gap-1.5">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16, lineHeight: 1 }}
                      >
                        account_balance_wallet
                      </span>
                      Connect Wallet
                    </span>
                  }
                  className="rounded-xl px-4 py-2 text-[13px] font-black tracking-wide transition-all"
                  style={{
                    background: "rgba(59,130,246,0.16)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(59,130,246,0.42)",
                    boxShadow:
                      "0 10px 24px rgba(2,132,199,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all"
              style={{
                background: "rgba(148,163,184,0.1)",
                border: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              {mobileOpen
                ? <X size={16} className="text-slate-300" />
                : <Menu size={16} className="text-slate-300" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div
            className="lg:hidden px-4 pb-5 pt-3"
            style={{
              borderTop: "1px solid rgba(59,130,246,0.12)",
              background: "rgba(2,8,23,0.9)",
            }}
          >
            <div className="flex flex-col gap-1 mb-4">
              {navLinks.map(({ href, label, icon }) => {
                const active =
                  pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    style={
                      active
                        ? {
                            color: "#fff",
                            background:
                              "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.12))",
                            border: "1px solid rgba(59,130,246,0.3)",
                          }
                        : {
                            color: "#94a3b8",
                            border: "1px solid transparent",
                          }
                    }
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: active ? "#3b82f6" : "inherit" }}
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
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-400">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14, color: "#3b82f6" }}
                  >
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
