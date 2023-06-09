import Background from "#/ui/home/background";
import Demo from "#/ui/home/demo";
import Globe from "#/ui/home/globe";
import Stats from "#/ui/home/stats";
import Features from "#/ui/home/features";
import Hero from "#/ui/home/hero";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";
import OSS from "#/ui/home/oss";
import Testimonials from "#/ui/home/testimonials";
import { constructMetadata } from "#/lib/utils";

export const metadata = constructMetadata({});

export default function Home() {
  return (
    <>
      <Hero />
      <Demo />
      <Logos />
      {/* @ts-expect-error Async Server Component */}
      <Globe />
      {/* @ts-expect-error Async Server Component */}
      <Stats />
      <Features />
      {/* @ts-expect-error Async Server Component */}
      <Testimonials />
      {/* @ts-expect-error Async Server Component */}
      <OSS />
    </>
  );
}
