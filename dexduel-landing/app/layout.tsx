import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import WebGLWrapper from "@/components/webgl/WebGLWrapper";

export const metadata: Metadata = {
  title: "DexDuel | No-Loss Price Prediction Arena",
  description:
    "Predict crypto prices, compete in tournaments, and win rewards — all without risking your principal. Built on OneChain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=panchang@300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <WebGLWrapper />
        <Header />
        <main className="relative z-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}
