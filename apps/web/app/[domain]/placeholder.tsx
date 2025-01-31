"use client";

import { CTA } from "@/ui/placeholders/cta";
import { FeaturesSection } from "@/ui/placeholders/features-section";
import { buttonVariants, Grid, Logo } from "@dub/ui";
import { cn, createHref } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrowserGraphic } from "./browser-graphic";
import { BubbleIcon } from "./bubble-icon";

const HERO_GRADIENT = `radial-gradient(77% 116% at 37% 67%, #EEA5BA, rgba(238, 165, 186, 0) 50%),
  radial-gradient(56% 84% at 34% 56%, #3A8BFD, rgba(58, 139, 253, 0) 50%),
  radial-gradient(85% 127% at 100% 100%, #E4C795, rgba(228, 199, 149, 0) 50%),
  radial-gradient(82% 122% at 3% 29%, #855AFC, rgba(133, 90, 252, 0) 50%),
  radial-gradient(90% 136% at 52% 100%, #FD3A4E, rgba(253, 58, 78, 0) 50%),
  radial-gradient(102% 143% at 92% 7%, #72FE7D, rgba(114, 254, 125, 0) 50%)`;

const UTM_PARAMS = {
  utm_source: "Custom Domain",
  utm_medium: "Welcome Page",
};

export default function PlaceholderContent() {
  const { domain } = useParams() as { domain: string };

  return (
    <div>
      <div className="relative mx-auto mt-4 w-full max-w-screen-lg overflow-hidden rounded-2xl bg-neutral-50 p-6 text-center sm:p-20 sm:px-0">
        <Grid
          cellSize={80}
          patternOffset={[1, -58]}
          className="inset-[unset] left-1/2 top-0 w-[1200px] -translate-x-1/2 text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />
        <div className="absolute -inset-x-10 bottom-0 h-[60%] opacity-40 blur-[100px] [transform:translate3d(0,0,0)]">
          <div
            className="size-full -scale-y-100 [mask-image:radial-gradient(closest-side,black_100%,transparent_100%)]"
            style={{ backgroundImage: HERO_GRADIENT }}
          />
        </div>
        <div className="relative mx-auto flex w-full max-w-xl flex-col items-center">
          <BubbleIcon icon={Logo} />
          <div className="mt-16 w-full">
            <BrowserGraphic domain={domain} />
          </div>
          <h1
            className={cn(
              "font-display mt-2 text-center text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15]",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:20px] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            Welcome to Dub
          </h1>
          <p
            className={cn(
              "mt-5 text-balance text-base text-neutral-700 sm:text-xl",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            This custom domain is powered by Dub.co &ndash; the link management
            platform designed for modern marketing teams.
          </p>
        </div>

        <div
          className={cn(
            "relative mx-auto mt-8 flex max-w-fit space-x-4",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]",
          )}
        >
          <Link
            href="https://d.to/register"
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-10 items-center rounded-lg border px-5 text-base",
            )}
          >
            Try Dub today
          </Link>
          <Link
            href={createHref("/home", domain, {
              ...UTM_PARAMS,
              utm_campaign: domain,
              utm_content: "Learn more",
            })}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-10 items-center rounded-lg border px-5 text-base",
            )}
          >
            Learn more
          </Link>
        </div>
      </div>
      <div className="mt-20">
        <FeaturesSection domain={domain} utmParams={UTM_PARAMS} />
      </div>
      <div className="mt-32">
        <CTA domain={domain} utmParams={UTM_PARAMS} />
      </div>
    </div>
  );
}
