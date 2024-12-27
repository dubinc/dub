"use client";

import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { Link, Program } from "@dub/prisma/client";
import {
  Button,
  Check,
  Copy,
  MoneyBill2,
  ToggleGroup,
  useCopyToClipboard,
  Wordmark,
} from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import { AnimatePresence } from "framer-motion";
import { CSSProperties, useState } from "react";
import { EmbedActivity } from "../activity";
import { EmbedFAQ } from "../faq";
import { EmbedLeaderboard } from "../leaderboard";
import { EmbedPayouts } from "../payouts";
import { EmbedQuickstart } from "../quickstart";
import { EmbedSales } from "../sales";
import { LinkToken } from "../token";
import { HeroBackground } from "./hero-background";

export function EmbedInlinePageClient({
  program,
  link,
}: {
  program: Program;
  link: Link;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const tabs = ["Quickstart", "Sales", "Leaderboard", "FAQ"];
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
            <MoneyBill2 className="size-4" />
            Refer and earn
          </span>
          <div className="relative mt-16 text-lg text-neutral-900 sm:max-w-[50%]">
            <ProgramCommissionDescription program={program} />
          </div>
          <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative flex flex-col items-center gap-2">
            <input
              type="text"
              readOnly
              value={getPrettyUrl(link.shortLink)}
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
              onClick={() => copyToClipboard(link.shortLink)}
            />
          </div>
          <a
            href="https://d.to/conversions"
            target="_blank"
            className="mt-4 flex items-center justify-center gap-1.5 text-neutral-500 transition-colors duration-75 hover:text-neutral-700 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0"
          >
            <p className="text-xs font-medium">Powered by</p>
            <Wordmark className="h-3.5 text-neutral-900" />
          </a>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <EmbedActivity
            clicks={link.clicks}
            leads={link.leads}
            sales={link.sales}
          />
          <EmbedPayouts />
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
                <EmbedQuickstart program={program} link={link.shortLink} />
              ) : selectedTab === "Sales" ? (
                <EmbedSales salesCount={link.sales} />
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
