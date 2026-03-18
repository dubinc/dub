import { ButtonLink } from "@/ui/placeholders/button-link";
import { Hero } from "@/ui/placeholders/hero";
import { Logo } from "@dub/ui";
import { cn, createHref, getApexDomain } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { BubbleIcon } from "../../ui/placeholders/bubble-icon";
import { BrowserGraphic } from "./browser-graphic";

const UTM_PARAMS = {
  utm_source: "Custom Domain",
  utm_medium: "Landing Page",
};

type LandingPageLink = {
  id: string;
  shortLink: string;
  url: string;
  title: string | null;
  description: string | null;
  clicks: number;
};

export function LandingPage({
  domain,
  title,
  description,
  featuredLinks,
}: {
  domain: string;
  title: string;
  description: string;
  featuredLinks: LandingPageLink[];
}) {
  return (
    <div>
      <Hero>
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center">
          <BubbleIcon>
            <Logo className="size-10" />
          </BubbleIcon>
          <div className="mt-16 w-full max-w-xl">
            <BrowserGraphic domain={domain} />
          </div>
          <h1
            className={cn(
              "font-display mt-2 text-center text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15]",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:20px] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "mt-5 max-w-2xl text-balance text-center text-base text-neutral-700 sm:text-xl",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            {description}
          </p>

          <div
            className={cn(
              "xs:flex-row relative mx-auto mt-8 flex max-w-fit flex-col items-center gap-4",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            {featuredLinks[0] && (
              <ButtonLink variant="primary" href={featuredLinks[0].shortLink}>
                Open featured link
              </ButtonLink>
            )}
            <ButtonLink
              variant="secondary"
              href={createHref("/links", domain, {
                ...UTM_PARAMS,
                utm_campaign: domain,
                utm_content: "Powered by Dub",
              })}
            >
              Powered by Dub
            </ButtonLink>
          </div>
        </div>
      </Hero>

      <section className="mx-auto mt-20 max-w-6xl px-4 pb-24 sm:px-6">
        {featuredLinks.length > 0 ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Featured Links
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">
                  Explore what&apos;s available on {domain}
                </h2>
              </div>
              <p className="hidden text-sm text-neutral-500 sm:block">
                {featuredLinks.length} public link
                {featuredLinks.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featuredLinks.map((link) => {
                const hostname = getApexDomain(link.url);
                const pathname = new URL(link.shortLink).pathname || "/";

                return (
                  <a
                    key={link.id}
                    href={link.shortLink}
                    className="group rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
                        {pathname}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {link.clicks} click{link.clicks === 1 ? "" : "s"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-neutral-900 transition-colors group-hover:text-black">
                      {link.title || pathname.slice(1) || domain}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm text-neutral-600">
                      {link.description || `Redirects to ${hostname}.`}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                      <span className="truncate text-neutral-500">
                        {hostname}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-neutral-900">
                        Visit
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
              Landing Page Ready
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-900">
              Add cloaked links to showcase them here
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-neutral-600 sm:text-base">
              This landing page is live. As soon as this domain has active
              cloaked links, they&apos;ll appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
