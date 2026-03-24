import Link from "next/link";
import { Zap, Github, Twitter } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center">
                <Zap size={14} className="text-white" fill="white" />
              </div>
              <span className="font-bold gradient-text">DexDuel</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
              Lossless GameFi prediction arena on ONE chain. Compete, predict, and earn yield.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigate</p>
            <div className="space-y-2">
              {[
                { href: "/tournaments", label: "Tournaments" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/profile", label: "My Arena" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Chain info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Network</p>
            <div className="space-y-2">
              <a
                href={EXPLORER_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Explorer
              </a>
              <p className="text-xs text-gray-600">ONE Chain Testnet</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} DexDuel. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-gray-600 hover:text-gray-400 transition-colors"
            >
              <Github size={14} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-gray-600 hover:text-gray-400 transition-colors"
            >
              <Twitter size={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
