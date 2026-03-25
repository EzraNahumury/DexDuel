import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Architecture from "@/components/Architecture";
import Tokenomics from "@/components/Tokenomics";
import Roadmap from "@/components/Roadmap";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Architecture />
      <Tokenomics />
      <Roadmap />
      <CallToAction />
      <Footer />
    </>
  );
}
