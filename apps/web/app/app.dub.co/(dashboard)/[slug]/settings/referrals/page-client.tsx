"use client";

import {
  REFERRAL_CLICKS_QUOTA_BONUS,
  REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  REFERRAL_REVENUE_SHARE,
} from "@/lib/referrals/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralsEmbed } from "@dub/blocks";
import { Check, Wordmark } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { redirect } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { HeroBackground } from "./hero-background";
import { ReferralLinkSkeleton } from "./referral-link";

export default function ReferralsPageClient() {
  const { slug, flags } = useWorkspace();
  const [publicToken, setPublicToken] = useState<string | null>(null);

  // Get publicToken from server when component mounts
  const createPublicToken = useCallback(async () => {
    const response = await fetch(`/api/workspaces/${slug}/referrals-token`, {
      method: "POST",
    });

    if (!response.ok) {
      throw toast.error("Failed to create public token");
    }

    const { publicToken } = (await response.json()) as {
      publicToken: string;
    };

    setPublicToken(publicToken);
  }, [slug]);

  useEffect(() => {
    createPublicToken();
  }, []);

  if (!flags?.referrals) {
    redirect(`/${slug}/settings`);
  }

  if (!publicToken) {
    return <ReferralLinkSkeleton />;
  }

  return (
    <div>
      <div className="relative">
        <div className="relative overflow-hidden rounded-xl border border-gray-200 p-4 sm:p-9">
          <Suspense>
            <HeroBackground slug={slug!} />
          </Suspense>

          <div className="relative">
            <h1 className="text-xl font-semibold text-black sm:text-2xl">
              Refer and earn
            </h1>

            {/* Benefits */}
            <div className="mt-6 flex flex-col gap-6">
              {[
                {
                  title: `${nFormatter(REFERRAL_REVENUE_SHARE * 100)}% recurring revenue`,
                  description: "per paying customer (up to 1 year)",
                },
                {
                  title: `${nFormatter(REFERRAL_CLICKS_QUOTA_BONUS)} extra clicks quota per month`,
                  description: `per signup (up to ${nFormatter(REFERRAL_CLICKS_QUOTA_BONUS_MAX, { full: true })} total)`,
                },
              ].map(({ title, description }) => (
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 to-white">
                    <div className="rounded-full bg-green-500 p-0.5">
                      <Check className="size-3.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-800">
                      {title}
                    </p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Referral link + invite button or empty/error states */}
            <Suspense fallback={<ReferralLinkSkeleton />}>
              {/* <ReferralLink slug={slug!} /> */}
            </Suspense>
          </div>
        </div>

        {/* Powered by Dub Conversions */}
        <a
          href="https://d.to/conversions"
          target="_blank"
          className="mt-2 flex items-center justify-center gap-2 rounded-lg border-gray-100 bg-white p-2 transition-colors hover:border-gray-200 active:bg-gray-50 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0 md:border md:drop-shadow-sm"
        >
          <Wordmark className="h-4" />
          <p className="text-xs text-gray-800">
            Powered by <span className="font-medium">Dub Conversions</span>
          </p>
        </a>
      </div>
      <ReferralsEmbed publicToken={publicToken} />;
    </div>
  );
}
