import { BubbleIcon } from "@/ui/placeholders/bubble-icon";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { CTA } from "@/ui/placeholders/cta";
import { FeaturesSection } from "@/ui/placeholders/features-section";
import { Hero } from "@/ui/placeholders/hero";
import { Footer, Nav, NavMobile, ShieldSlash } from "@dub/ui";
import { cn, constructMetadata, createHref } from "@dub/utils";

export const runtime = "edge";

export const metadata = constructMetadata({
  title: "Banned Link",
  description: "This link has been banned for violating our terms of service.",
  noIndex: true,
});

const UTM_PARAMS = {
  utm_source: "Expired Link",
  utm_medium: "Expired Link Page",
};

export default async function BannedPage({
  params,
}: {
  params: { domain: string };
}) {
  return (
    <main className="flex min-h-screen flex-col justify-between">
      <NavMobile />
      <Nav maxWidthWrapperClassName="max-w-screen-lg lg:px-4 xl:px-0" />
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
            <ButtonLink
              variant="secondary"
              href={createHref("/home", params.domain, {
                ...UTM_PARAMS,
                utm_campaign: params.domain,
                utm_content: "Learn more",
              })}
            >
              Learn more
            </ButtonLink>
          </div>
        </Hero>
        <div className="mt-20">
          <FeaturesSection domain={params.domain} utmParams={UTM_PARAMS} />
        </div>
        <div className="mt-32">
          <CTA domain={params.domain} utmParams={UTM_PARAMS} />
        </div>
      </div>
      <Footer className="max-w-screen-lg border-0 bg-transparent lg:px-4 xl:px-0" />
    </main>
  );
}
