"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { buttonVariants } from "@dub/ui";
import { COUNTRIES, cn } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

export default function PartnerDirectoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { plan } = useWorkspace();
  const { program, loading } = useProgram();

  if (loading) return <LayoutLoader />;

  if (!program?.partnerNetworkEnabledAt) return <DirectoryUpsell contactUs />;

  const { canDiscoverPartners } = getPlanCapabilities(plan);
  if (!canDiscoverPartners) return <DirectoryUpsell />;

  return children;
}

function DirectoryUpsell({ contactUs }: { contactUs?: boolean }) {
  return (
    <PageContent title="Partner Discovery">
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
        <div
          className="flex w-full max-w-sm flex-col gap-4 overflow-hidden px-4 [mask-image:linear-gradient(transparent,black,transparent)]"
          aria-hidden
        >
          {EXAMPLE_PARTNERS.map((partner, idx) => (
            <ExamplePartnerCell key={idx} partner={partner} />
          ))}
        </div>
        <div className="max-w-80 text-pretty text-center">
          <span className="text-base font-medium text-neutral-900">
            Partner Discovery
          </span>
          <p className="mt-2 text-pretty text-sm text-neutral-500">
            Discover and recruit partners to help grow your revenue. Available
            on Enterprise plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="https://dub.co/contact/sales?utm_content=Partner+Discovery"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
            )}
          >
            {contactUs ? "Contact us" : "Upgrade to Enterprise"}
          </Link>
        </div>
      </div>
    </PageContent>
  );
}

const EXAMPLE_PARTNERS = [
  {
    name: "Lauren Anderson",
    country: "US",
    index: 0,
  },
  {
    name: "Elias Weber",
    country: "DE",
    index: 4,
  },
  {
    name: "Hiroshi Tanaka",
    country: "JP",
    index: 3,
  },
  {
    name: "Mia Taylor",
    country: "US",
    index: 1,
  },
];

function ExamplePartnerCell({
  partner,
}: {
  partner: (typeof EXAMPLE_PARTNERS)[number];
}) {
  return (
    <div className="flex size-full select-none items-center justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-transparent bg-white p-4 pr-5">
      <div className="flex items-center gap-4">
        <div
          key={partner.index}
          className="size-10 rounded-full border border-neutral-300 bg-neutral-300"
          style={{
            backgroundImage:
              "url(https://assets.dub.co/partners/partner-images.jpg)",
            backgroundSize: "1400%", // 14 images
            backgroundPositionX: (14 - (partner.index % 14)) * 100 + "%",
          }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-content-default whitespace-nowrap text-sm font-semibold">
            {partner.name}
          </span>
          <div className="flex items-center gap-1">
            <img
              alt={`${partner.country} flag`}
              src={`https://hatscripts.github.io/circle-flags/flags/${partner.country.toLowerCase()}.svg`}
              className="size-2.5 rounded-full"
            />
            <span className="text-content-subtle whitespace-nowrap text-xs font-medium">
              {COUNTRIES[partner.country]}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-content-default text-content-inverted flex h-7 items-center justify-center rounded-lg px-2.5 text-sm">
        Send invite
      </div>
    </div>
  );
}
