"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Badge, buttonVariants } from "@dub/ui";
import { capitalize, cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    slug,
    plan,
    defaultProgramId,
    partnersEnabled,
    loading,
    mutate: mutateWorkspace,
  } = useWorkspace();

  // Whether the workspace has been refreshed or doesn't need to be
  const [isFresh, setIsFresh] = useState(false);

  useEffect(() => {
    if (!defaultProgramId && !isFresh)
      mutateWorkspace().then(() => setIsFresh(true));
    else setIsFresh(true);
  }, [defaultProgramId, mutateWorkspace, isFresh]);

  if (loading || !isFresh) {
    return <LayoutLoader />;
  }

  if (!defaultProgramId && partnersEnabled) redirect(`/${slug}/program/new`);

  if (!getPlanCapabilities(plan).canManageProgram) {
    return <UpgradeCTA />;
  }

  return children;
}

export const EXAMPLE_PARTNERS = [
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

const UpgradeCTA = () => {
  const { slug, plan } = useWorkspace();

  const { canManageProgram } = getPlanCapabilities(plan);

  return (
    <div className="flex min-h-[calc(100vh-10px)] flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="grid w-fit grid-cols-2 overflow-hidden px-4 [mask-image:linear-gradient(black,transparent)]">
        {EXAMPLE_PARTNERS.map((partner, idx) => (
          <ExamplePartnerCell key={idx} partner={partner} />
        ))}
      </div>
      <Badge variant="blueGradient">Coming soon</Badge>
      <div className="max-w-sm text-pretty text-center">
        <span className="text-base font-medium text-neutral-900">
          Dub Partners
        </span>
        <p className="mt-2 text-pretty text-sm text-neutral-500">
          Kickstart viral product-led growth with powerful, branded referral and
          affiliate programs.{" "}
          <Link
            href="https://dub.co/partners"
            target="_blank"
            className="text-content-default hover:text-content-emphasis font-medium transition-colors"
          >
            Learn more ↗
          </Link>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={
            canManageProgram
              ? "https://dub.co/help/article/dub-partners"
              : `/${slug}/upgrade`
          }
          className={cn(
            buttonVariants({ variant: "primary" }),
            "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
          )}
        >
          {canManageProgram ? "Join the waitlist" : "Upgrade plan"}
        </Link>
      </div>
    </div>
  );
};

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
