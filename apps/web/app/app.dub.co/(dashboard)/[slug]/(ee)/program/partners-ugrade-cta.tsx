"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { Badge, buttonVariants } from "@dub/ui";
import { capitalize, cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

export function PartnersUpgradeCTA({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { slug, plan, partnersEnabled, store } = useWorkspace();

  const { canManageProgram } = getPlanCapabilities(plan);

  const { cta, href } = useMemo(() => {
    if (partnersEnabled) {
      if (!canManageProgram) {
        return {
          cta: "Upgrade plan",
          href: `/${slug}/upgrade`,
        };
      } else {
        return {
          cta: store?.programOnboarding ? "Finish creating" : "Create program",
          href: `/${slug}/program/new`,
        };
      }
    } else {
      return {
        cta: "Join the waitlist",
        href: "https://dub.co/partners",
      };
    }
  }, [canManageProgram, partnersEnabled, slug]);

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      <div className="grid w-max grid-cols-2 overflow-hidden px-4 [mask-image:linear-gradient(black,transparent)]">
        {EXAMPLE_PARTNERS.map((partner, idx) => (
          <ExamplePartnerCell key={idx} partner={partner} />
        ))}
      </div>
      <Badge variant="blueGradient">Coming soon</Badge>
      <div className="max-w-sm text-pretty text-center">
        <span className="text-base font-medium text-neutral-900">
          {title || "Dub Partners"}
        </span>
        <p className="mt-2 text-pretty text-sm text-neutral-500">
          {description || (
            <>
              Kickstart viral product-led growth with powerful, branded referral
              and affiliate programs.{" "}
              <Link
                href="https://dub.co/partners"
                target="_blank"
                className="text-content-default hover:text-content-emphasis font-medium transition-colors"
              >
                Learn more ↗
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
          )}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

const EXAMPLE_PARTNERS = [
  {
    name: "Lauren Anderson",
    country: "US",
    revenue: 1_800,
    payouts: 550,
    index: 0,
  },
  {
    name: "Elias Weber",
    country: "DE",
    revenue: 783,
    payouts: 235,
    index: 4,
  },
  {
    name: "Hiroshi Tanaka",
    country: "JP",
    revenue: 19_200,
    payouts: 5_700,
    index: 3,
  },
  {
    name: "Mia Taylor",
    country: "US",
    revenue: 22_600,
    payouts: 6_800,
    index: 1,
  },
];

function ExamplePartnerCell({
  partner,
}: {
  partner: (typeof EXAMPLE_PARTNERS)[number];
}) {
  return (
    <div className="h-[104px] w-[284px] p-1">
      <div className="flex size-full select-none overflow-hidden rounded-[10px] border border-neutral-200 bg-transparent bg-white p-2">
        {partner && (
          <>
            <div
              key={partner.index}
              className="aspect-square h-full rounded-lg border border-neutral-300 bg-neutral-300"
              style={{
                backgroundImage:
                  "url(https://assets.dub.co/partners/partner-images.jpg)",
                backgroundSize: "1400%", // 14 images
                backgroundPositionX: (14 - (partner.index % 14)) * 100 + "%",
              }}
            />
            <div className="flex h-full flex-col justify-between px-4 py-3">
              <div className="flex items-center gap-1.5">
                <img
                  alt={`${partner.country} flag`}
                  src={`https://hatscripts.github.io/circle-flags/flags/${partner.country.toLowerCase()}.svg`}
                  className="size-3.5 rounded-full"
                />
                <span className="whitespace-nowrap text-sm font-medium text-neutral-800">
                  {partner.name}
                </span>
              </div>
              <div className="flex divide-x divide-neutral-200">
                {["revenue", "payouts"].map((key, idx) => (
                  <div
                    key={key}
                    className={cn("flex flex-col", idx === 0 ? "pr-6" : "pl-6")}
                  >
                    <span className="text-xs font-medium text-neutral-400">
                      {capitalize(key)}
                    </span>
                    <span className="text-sm font-medium text-neutral-600">
                      ${nFormatter(partner[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
