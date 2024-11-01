import { BlurImage } from "@dub/ui";
import Image from "next/image";

const heroGradient =
  "conic-gradient(from 45deg at 65% 70%, #8B5CF6 0deg, #7B4EE4 72deg, #6B40D2 144deg, #8B5CF6 197.89deg, #7B4EE4 260.96deg, #6B40D2 360deg)";

export function HeroBackground({ logo }: { logo?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(100%_100%_at_top_right,black,transparent)] max-[350px]:opacity-50 sm:[mask-image:linear-gradient(to_right,transparent_50%,black_70%)]">
      <div className="absolute -right-[60px] top-[40px] isolate w-[600px] -translate-y-1/2 overflow-hidden bg-white sm:-right-[60px] sm:top-1/2 sm:w-[1200px] md:right-0">
        <div
          className="absolute -inset-[50%] opacity-15 blur-[100px]"
          style={{
            backgroundImage: heroGradient,
          }}
        />
        <Image
          src="https://assets.dub.co/misc/referrals-hero-background.svg"
          alt="Refer and earn"
          width={1200}
          height={630}
          className="relative"
        />
        <div
          className="absolute -inset-[50%] mix-blend-soft-light blur-[100px]"
          style={{
            backgroundImage: heroGradient,
          }}
        />
        {logo && (
          <BlurImage
            src={logo}
            alt="Program Logo"
            width={1200}
            height={1200}
            className="absolute right-[9.9%] top-[49.9%] size-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white sm:size-20 sm:drop-shadow-lg"
          />
        )}
      </div>
    </div>
  );
}
