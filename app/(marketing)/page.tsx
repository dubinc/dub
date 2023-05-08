import Background from "@/components/shared/background";
import Demo from "#/ui/home/demo";
import Features from "#/ui/home/features";
import Globe from "#/ui/home/globe";
import Hero from "#/ui/home/hero";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";
import OSS from "#/ui/home/oss";
import Testimonials from "#/ui/home/testimonials";
import { Suspense } from "react";

export const runtime = "edge";

export default function Home() {
  return (
    <>
      <div className="z-10">
        <Hero />
        <Demo />
        <Logos />
        <Globe />
        <Features />
        <Suspense fallback="">
          {/* @ts-expect-error Async Server Component */}
          <Testimonials />
        </Suspense>
        <Pricing homePage />
        <Suspense fallback="">
          {/* @ts-expect-error Async Server Component */}
          <OSS />
        </Suspense>
      </div>
      <Background />
    </>
  );
}
