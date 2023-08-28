import Hero from "#/ui/home/hero";
import Demo from "#/ui/home/demo";
import Globe from "#/ui/home/globe";
import Stats, { StatsSection } from "#/ui/home/stats";
import Features from "#/ui/home/features";
import Logos from "#/ui/home/logos";
import OSS, { OSSSection } from "#/ui/home/oss";
import Testimonials from "#/ui/home/testimonials";
import Changelog from "#/ui/home/changelog";
import { Suspense } from "react";
import GlobeClient from "#/ui/home/globe-client";
import CTA from "#/ui/home/cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Demo />
      <Logos />
      <Suspense fallback={<GlobeClient markers={[]} />}>
        <Globe />
      </Suspense>
      <Suspense
        fallback={
          <StatsSection domains={1000} shortlinks={20000} clicks={3500000} />
        }
      >
        <Stats />
      </Suspense>
      <Features />
      <Suspense>
        <Testimonials />
      </Suspense>
      <Changelog />
      <Suspense fallback={<OSSSection stars={10000} />}>
        <OSS />
      </Suspense>
      <CTA />
    </>
  );
}
