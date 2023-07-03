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
      <Globe />
      <Stats />
      <Features />
      <Testimonials />
      <OSS />
    </>
  );
}
