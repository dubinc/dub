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
} from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import { CSSProperties, useState } from "react";
import { EmbedWidgetActivity } from "../activity";
import { EmbedWidgetPayouts } from "../payouts";
import { EmbedWidgetSales } from "../sales";
import { LinkToken } from "../token";

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
        { "--accent-color": program.brandColor || "#171717" } as CSSProperties
      }
    >
      <div className="p-5">
        <div className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
          <span className="flex items-center gap-2 text-sm text-neutral-500">
            <MoneyBill2 className="size-4" />
            Refer and earn
          </span>
          <div className="relative mt-6 text-lg text-neutral-900 sm:max-w-[50%]">
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
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-200 px-3 text-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 lg:min-w-64 xl:min-w-72"
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
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <EmbedWidgetActivity
            clicks={link.clicks}
            leads={link.leads}
            sales={link.sales}
          />
          <EmbedWidgetPayouts />
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
            className="w-full rounded-lg"
          />
          <EmbedWidgetSales salesCount={link.sales} />
        </div>
        <LinkToken />
      </div>
    </div>
  );
}
