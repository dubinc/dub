import { ExpandingArrow } from "@dub/ui";
import { cn, createHref, UTMTags } from "@dub/utils";
import Link from "next/link";
import { PropsWithChildren } from "react";
import Markdown from "react-markdown";
import { Analytics } from "./feature-graphics/analytics";
import { Collaboration } from "./feature-graphics/collaboration";
import { Domains } from "./feature-graphics/domains";
import { Personalization } from "./feature-graphics/personalization";
import { QR } from "./feature-graphics/qr";

export function FeaturesSection({
  domain,
  utmParams,
}: {
  domain: string;
  utmParams: Partial<Record<(typeof UTMTags)[number], string>>;
}) {
  return (
    <div className="mt-20">
      <div className="mx-auto w-full max-w-xl px-4 text-center">
        <div className="mx-auto flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-800">
          What is Dub?
        </div>
        <h2 className="font-display mt-2 text-balance text-3xl font-medium text-neutral-900">
          Powerful features for modern marketing teams
        </h2>
        <p className="mt-3 text-pretty text-lg text-neutral-500">
          Dub is more than just a link shortener. We've built a suite of
          powerful features that gives you marketing superpowers.
        </p>
      </div>
      <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 px-4 sm:grid-cols-2">
        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x">
          <FeatureCard
            title="Stand out with custom domains"
            description="Create branded short links with your own domain and [improve click-through rates by 30%](/blog/custom-domains). Paid plans also include a [complimentary custom domain](/help/article/free-dot-link-domain)."
            linkText="Learn more"
            href={createHref("/help/article/how-to-add-custom-domain", domain, {
              utm_campaign: domain,
              utm_content: "Learn more",
              ...utmParams,
            })}
          >
            <Domains />
          </FeatureCard>
          <FeatureCard
            title="Branded QR codes"
            description="QR codes and short links are like peas in a pod. Dub offers free QR codes for every short link you create. Feeling artsy? [Customize them with your own logo](/help/article/custom-qr-codes)."
            linkText="Try the demo"
            href={createHref("/tools/qr-code", domain, {
              utm_campaign: domain,
              utm_content: "Learn more",
              ...utmParams,
            })}
          >
            <QR />
          </FeatureCard>
        </div>

        <FeatureCard
          className="border-y border-neutral-200 pt-12 sm:col-span-2"
          graphicClassName="sm:h-96"
          title="Analytics that matter"
          description="Dub provides powerful analytics for your links, including geolocation, device, browser, and referrer information."
          linkText="Explore analytics"
          href={createHref("/help/article/dub-analytics", domain, {
            utm_campaign: domain,
            utm_content: "Learn more",
            ...utmParams,
          })}
        >
          <a
            href="https://d.to/stats/try"
            target="_blank"
            className="group block size-full"
          >
            <div className="size-full transition-[filter,opacity] duration-300 group-hover:opacity-70 group-hover:blur-[3px]">
              <Analytics />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex items-center text-sm font-medium text-slate-900">
                View live demo <ExpandingArrow className="size-4" />
              </span>
            </div>
          </a>
        </FeatureCard>

        <div className="contents divide-neutral-200 max-sm:divide-y sm:divide-x [&>*]:border-t [&>*]:border-neutral-200">
          <FeatureCard
            title="Advanced link features"
            description="Supercharge your links with [custom link previews](/help/article/custom-link-previews), [device targeting](/help/article/device-targeting), [geo targeting](/help/article/geo-targeting), [link cloaking](/help/article/link-cloaking), [password protection](/help/article/password-protected-links), and more."
            linkText="Learn more"
            href={createHref("/help/article/how-to-create-link", domain, {
              utm_campaign: domain,
              utm_content: "Learn more",
              ...utmParams,
            })}
          >
            <Personalization />
          </FeatureCard>
          <FeatureCard
            title="Collaborate with your team"
            description="Invite your teammates to collaborate on your links. For [enterprises](/enterprise), Dub offers [SAML SSO](/help/category/saml-sso) with Okta, Google, and Azure AD for higher security."
            linkText="Learn more"
            href={createHref("/help/article/how-to-invite-teammates", domain, {
              utm_campaign: domain,
              utm_content: "Learn more",
              ...utmParams,
            })}
          >
            <Collaboration />
          </FeatureCard>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  linkText,
  href,
  children,
  className,
  graphicClassName,
}: PropsWithChildren<{
  title: string;
  description: string;
  linkText: string;
  href: string;
  className?: string;
  graphicClassName?: string;
}>) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-10 px-4 py-14 sm:px-12",
        className,
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/3 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[50px]",
          "bg-[conic-gradient(from_270deg,#F4950C,#EB5C0C,transparent,transparent)]",
        )}
      />
      <div
        className={cn(
          "relative h-64 overflow-hidden sm:h-[302px]",
          graphicClassName,
        )}
      >
        {children}
      </div>
      <div className="relative flex flex-col">
        <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        <Markdown
          className={cn(
            "mt-2 text-neutral-500 transition-colors",
            "[&_a]:font-medium [&_a]:text-neutral-600 [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2 hover:[&_a]:text-neutral-800",
          )}
          components={{
            a: ({ children, href }) => {
              if (!href) return null;
              return (
                <Link href={href} target="_blank">
                  {children}
                </Link>
              );
            },
          }}
        >
          {description}
        </Markdown>
        <Link
          href={href}
          className={cn(
            "mt-6 w-fit whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium leading-none text-neutral-900 transition-colors duration-75",
            "outline-none hover:bg-neutral-50 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 active:bg-neutral-100",
          )}
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
}
