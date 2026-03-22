import { BubbleIcon } from "@/ui/placeholders/bubble-icon";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { CTA } from "@/ui/placeholders/cta";
import { FeaturesSection } from "@/ui/placeholders/features-section";
import { Hero } from "@/ui/placeholders/hero";
import { LearnMoreButton } from "@/ui/placeholders/learn-more-button";
import { ShieldSlash } from "@dub/ui";
import { cn, constructMetadata } from "@dub/utils";

export const revalidate = false; // cache indefinitely

export const metadata = constructMetadata({
  title: "Banned Link",
  description: "This link has been banned for violating our terms of service.",
  noIndex: true,
});

const UTM_PARAMS = {
  utm_source: "Banned Link",
  utm_medium: "Banned Link Page",
};

export function generateStaticParams() {
  return [];
}

export default async function BannedPage() {
  return (
    <div>
      <Hero>
        <div className="relative mx-auto flex w-full max-w-sm flex-col items-center">
          <BubbleIcon>
            <ShieldSlash className="size-12" />
          </BubbleIcon>
          <h1
            className={cn(
              "font-display mt-10 text-center text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15]",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:20px] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            Banned link
          </h1>
          <p
            className={cn(
              "mt-5 text-pretty text-base text-neutral-700 sm:text-xl",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            This link has been banned for violating our terms of service.
          </p>
        </div>

        <div
          className={cn(
            "xs:flex-row relative mx-auto mt-8 flex max-w-fit flex-col items-center gap-4",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]",
          )}
        >
          <ButtonLink variant="primary" href="https://app.dub.co/register">
            Try Dub today
          </ButtonLink>
          <LearnMoreButton utmParams={UTM_PARAMS} />
        </div>
      </Hero>
      <div className="mt-20">
        <FeaturesSection utmParams={UTM_PARAMS} />
      </div>
      <div className="mt-32">
        <CTA utmParams={UTM_PARAMS} />
      </div>
    </div>
  );
}
