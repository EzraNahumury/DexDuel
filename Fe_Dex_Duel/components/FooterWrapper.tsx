"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterWrapper() {
  const pathname = usePathname();
  // Homepage has its own custom footer
  if (pathname === "/") return null;
  return <Footer />;
}
