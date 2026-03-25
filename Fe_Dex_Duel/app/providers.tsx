"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
  lightTheme,
} from "@onelabs/dapp-kit";
import { AccountSelectionGate } from "@/components/AccountSelectionGate";
import { I18nProvider } from "@/lib/i18n";

const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://rpc-testnet.onelabs.cc:443" },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

const walletTheme = {
  ...lightTheme,
  backgroundColors: {
    ...lightTheme.backgroundColors,
    primaryButton: "#14315f",
    primaryButtonHover: "#1a427d",
    outlineButtonHover: "rgba(59,130,246,0.12)",
    modalOverlay: "rgba(2 6 23 / 72%)",
    modalPrimary: "#0b1220",
    modalSecondary: "#111b2f",
    iconButtonHover: "rgba(148,163,184,0.14)",
    dropdownMenu: "#0f172a",
    dropdownMenuSeparator: "rgba(148,163,184,0.18)",
    walletItemSelected: "rgba(59,130,246,0.2)",
    walletItemHover: "rgba(148,163,184,0.12)",
  },
  borderColors: {
    ...lightTheme.borderColors,
    outlineButton: "rgba(59,130,246,0.4)",
  },
  colors: {
    ...lightTheme.colors,
    primaryButton: "#e2e8f0",
    outlineButton: "#e2e8f0",
    body: "#e2e8f0",
    bodyMuted: "#94a3b8",
    iconButton: "#e2e8f0",
  },
  shadows: {
    ...lightTheme.shadows,
    primaryButton:
      "0 10px 22px rgba(2,132,199,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
    walletItemSelected: "0 8px 20px rgba(2,132,199,0.18)",
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect={false} storage={null} theme={walletTheme}>
          <I18nProvider>
            <AccountSelectionGate />
            {children}
          </I18nProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
