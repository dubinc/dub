"use client";

import { DiscountProps, RewardProps } from "@/lib/types";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { Link, PayoutStatus, Program } from "@dub/prisma/client";
import {
  Button,
  Check,
  Copy,
  MoneyBill,
  ToggleGroup,
  useCopyToClipboard,
  Wordmark,
} from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import { AnimatePresence } from "framer-motion";
import { CSSProperties, useState } from "react";
import { ReferralsEmbedActivity } from "./activity";
import { ReferralsEmbedEarnings } from "./earnings";
import { ReferralsEmbedFAQ } from "./faq";
import { ReferralsEmbedLeaderboard } from "./leaderboard";
import { ReferralsEmbedPayouts } from "./payouts";
import { ReferralsEmbedQuickstart } from "./quickstart";
import { ReferralsReferralsEmbedToken } from "./token";

const tabs = ["Quickstart", "Earnings", "Leaderboard", "FAQ"];

export function ReferralsEmbedPageClient({
  program,
  links,
  reward,
  discount,
  payouts,
  stats,
}: {
  program: Program;
  links: Link[];
  reward: RewardProps | null;
  discount?: DiscountProps | null;
  payouts: {
    status: PayoutStatus;
    amount: number;
  }[];
  stats: {
    clicks: number;
    leads: number;
    sales: number;
  };
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  return (
    <div
      className="dark flex min-h-screen flex-col bg-black"
      style={
        { "--accent-color": program.brandColor || "#a8a8a8" } as CSSProperties
      }
    >
      <div className="p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground logo={program.logo} color={program.brandColor} />
          <span className="text-content-subtle flex items-center gap-2 text-sm">
            <MoneyBill className="size-4" />
            Refer and earn
          </span>
          <div className="text-content-emphasis relative mt-16 text-lg sm:max-w-[50%]">
            <ProgramRewardDescription reward={reward} discount={discount} />
          </div>
          <span className="text-content-default mb-1.5 mt-6 block text-sm">
            Referral link
          </span>
          <div className="xs:flex-row relative flex flex-col items-center gap-2">
            <input
              type="text"
              readOnly
              value={getPrettyUrl(links[0].shortLink)}
              className="xs:w-auto border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-neutral-500 lg:min-w-64 xl:min-w-72"
            />
            <Button
              icon={
                <div className="relative size-4">
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Copy className="size-4" />
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      !copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Check className="size-4" />
                  </div>
                </div>
              }
              text={copied ? "Copied link" : "Copy link"}
              className="xs:w-fit"
              onClick={() => copyToClipboard(links[0].shortLink)}
            />
          </div>
          <div className="mt-4 flex justify-center md:absolute md:bottom-3 md:right-3 md:mt-0">
            <a
              href="https://dub.partners"
              target="_blank"
              className="hover:text-content-default text-content-subtle bg-bg-default flex w-fit items-center gap-1.5 rounded-md border border-black/10 px-2 py-1 transition-colors duration-75"
            >
              <p className="whitespace-nowrap text-xs font-medium leading-none">
                Powered by
              </p>
              <Wordmark className="text-content-emphasis h-3.5" />
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <ReferralsEmbedActivity
            clicks={stats.clicks}
            leads={stats.leads}
            sales={stats.sales}
          />
          <ReferralsEmbedPayouts payouts={payouts} />
        </div>
        <div className="mt-4">
          <ToggleGroup
            options={tabs.map((tab) => ({
              label: tab,
              value: tab,
            }))}
            selected={selectedTab}
            selectAction={(option) => {
              setSelectedTab(option);
            }}
            className="bg-bg-muted w-full rounded-lg"
            optionClassName="w-full flex justify-center py-1.5"
            indicatorClassName="bg-bg-default"
          />
          <div className="my-4">
            <AnimatePresence mode="wait">
              {selectedTab === "Quickstart" ? (
                <ReferralsEmbedQuickstart program={program} link={links[0]} />
              ) : selectedTab === "Earnings" ? (
                <ReferralsEmbedEarnings salesCount={stats.sales} />
              ) : selectedTab === "Leaderboard" ? (
                <ReferralsEmbedLeaderboard />
              ) : selectedTab === "FAQ" ? (
                <ReferralsEmbedFAQ program={program} reward={reward} />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <ReferralsReferralsEmbedToken />
      </div>
    </div>
  );
}
