"use client";

import { DiscountProps } from "@/lib/types";
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
import { LinkToken } from "../token";
import { EmbedActivity } from "./activity";
import { EmbedEarnings } from "./earnings";
import { EmbedFAQ } from "./faq";
import { EmbedLeaderboard } from "./leaderboard";
import { EmbedPayouts } from "./payouts";
import { EmbedQuickstart } from "./quickstart";

export function EmbedInlinePageClient({
  program,
  links,
  discount,
  payouts,
  stats,
}: {
  program: Program;
  links: Link[];
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

  const tabs = ["Quickstart", "Earnings", "Leaderboard", "FAQ"];
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        { "--accent-color": program.brandColor || "#a8a8a8" } as CSSProperties
      }
    >
      <div className="p-5">
        <div className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-300 p-4 md:p-6">
          <HeroBackground logo={program.logo} color={program.brandColor} />
          <span className="flex items-center gap-2 text-sm text-neutral-500">
            <MoneyBill className="size-4" />
            Refer and earn
          </span>
          <div className="relative mt-16 text-lg text-neutral-900 sm:max-w-[50%]">
            <ProgramRewardDescription program={program} discount={discount} />
          </div>
          <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative flex flex-col items-center gap-2">
            <input
              type="text"
              readOnly
              value={getPrettyUrl(links[0].shortLink)}
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 lg:min-w-64 xl:min-w-72"
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
              className="flex w-fit items-center gap-1.5 rounded-md border border-black/10 bg-white px-2 py-1 text-neutral-500 transition-colors duration-75 hover:text-neutral-700"
            >
              <p className="whitespace-nowrap text-xs font-medium leading-none">
                Powered by
              </p>
              <Wordmark className="h-3.5 text-neutral-900" />
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <EmbedActivity
            clicks={stats.clicks}
            leads={stats.leads}
            sales={stats.sales}
          />
          <EmbedPayouts payouts={payouts} />
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
            className="w-full rounded-lg bg-neutral-50"
            optionClassName="w-full flex justify-center py-1.5"
            indicatorClassName="bg-white"
          />
          <div className="my-4">
            <AnimatePresence mode="wait">
              {selectedTab === "Quickstart" ? (
                <EmbedQuickstart program={program} link={links[0]} />
              ) : selectedTab === "Earnings" ? (
                <EmbedEarnings salesCount={stats.sales} />
              ) : selectedTab === "Leaderboard" ? (
                <EmbedLeaderboard />
              ) : selectedTab === "FAQ" ? (
                <EmbedFAQ program={program} />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <LinkToken />
      </div>
    </div>
  );
}
