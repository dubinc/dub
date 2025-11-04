import { Marquee } from "@/components/ui/marquee";
import {
  BarchartIcon,
  BenzingaIcon,
  FoxIcon,
  GlobeAndMailIcon,
  MSNIcon,
  YahooIcon,
} from "@/ui/landing/assets/svg/news";
import { ComponentType } from "react";

// Icon components as news
const newsLogos: Array<{
  Icon: ComponentType<{ className?: string }>;
  name: string;
}> = [
  { Icon: FoxIcon, name: "Fox News" },
  { Icon: GlobeAndMailIcon, name: "Globe and Mail" },
  { Icon: YahooIcon, name: "Yahoo Finance" },
  { Icon: BarchartIcon, name: "Barchart" },
  { Icon: BenzingaIcon, name: "Benzinga" },
  { Icon: MSNIcon, name: "MSN" },
];

export const LogoScrollingBanner = () => {
  return (
    <section className="w-full overflow-hidden">
      <div className="relative mx-auto max-w-7xl">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[rgb(248,252,252)] to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[rgb(248,252,252)] to-transparent sm:w-32" />
        <div className="overflow-hidden px-4 sm:px-6 lg:px-8">
          <Marquee pauseOnHover duration={40}>
            {newsLogos.map((logo, index) => {
              const Icon = logo.Icon;
              return (
                <div
                  key={index}
                  className="flex w-40 items-center justify-center "
                >
                  <Icon className="h-7 w-auto opacity-50 grayscale sm:h-6" />
                </div>
              );
            })}
          </Marquee>
        </div>
      </div>
    </section>
  );
};
