import { title, description, image } from "@/lib/constants";
import Background from "@/components/shared/background";
import Demo from "#/ui/home/demo";
import Globe from "#/ui/home/globe";
import Stats from "#/ui/home/stats";
import Features from "#/ui/home/features";
import Hero from "#/ui/home/hero";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";
import OSS from "#/ui/home/oss";
import Testimonials from "#/ui/home/testimonials";

export const metadata = {
  title,
  description,
  image,
  openGraph: {
    title,
    description,
    images: [
      {
        url: image,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
    creator: "@dubdotsh",
  },
};

export default function Home() {
  return (
    <>
      <div className="z-10">
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
        <Pricing homePage />
        {/* @ts-expect-error Async Server Component */}
        <OSS />
      </div>
      <Background />
    </>
  );
}
