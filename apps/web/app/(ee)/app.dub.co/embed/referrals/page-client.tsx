"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
import { DiscountProps, RewardProps } from "@/lib/types";
import { programEmbedSchema } from "@/lib/zod/schemas/program-embed";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { ThreeDots } from "@/ui/shared/icons";
import { Program } from "@dub/prisma/client";
import {
  Button,
  Check,
  Copy,
  Directions,
  Popover,
  TabSelect,
  useCopyToClipboard,
  useLocalStorage,
  Wordmark,
} from "@dub/ui";
import { cn, getDomainWithoutWWW, getPrettyUrl } from "@dub/utils";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ReferralsEmbedActivity } from "./activity";
import { ReferralsEmbedEarnings } from "./earnings";
import { ReferralsEmbedEarningsSummary } from "./earnings-summary";
import { ReferralsEmbedFAQ } from "./faq";
import { ReferralsEmbedLeaderboard } from "./leaderboard";
import ReferralsEmbedLinks from "./links";
import { ReferralsEmbedQuickstart } from "./quickstart";
import { ReferralsEmbedResources } from "./resources";
import { ThemeOptions } from "./theme-options";
import { ReferralsReferralsEmbedToken } from "./token";
import { ReferralsEmbedLink } from "./types";

export function ReferralsEmbedPageClient({
  program,
  links,
  rewards,
  discount,
  earnings,
  stats,
  themeOptions,
  dynamicHeight,
}: {
  program: Program;
  links: ReferralsEmbedLink[];
  rewards: RewardProps[];
  discount?: DiscountProps | null;
  earnings: {
    upcoming: number;
    paid: number;
  };
  stats: {
    clicks: number;
    leads: number;
    sales: number;
    saleAmount: number;
  };
  themeOptions: ThemeOptions;
  dynamicHeight: boolean;
}) {
  const resources = programResourcesSchema.parse(
    program.resources ?? { logos: [], colors: [], files: [] },
  );
  const programEmbedData = programEmbedSchema.parse(program.embedData);

  const hasResources =
    resources &&
    ["logos", "colors", "files"].some(
      (resource) => resources?.[resource]?.length,
    );

  const [showQuickstart, setShowQuickstart] = useLocalStorage(
    "referral-embed-show-quickstart",
    true,
  );

  const tabs = useMemo(
    () => [
      ...(showQuickstart ? ["Quickstart"] : []),
      "Earnings",
      "Links",
      ...(programEmbedData?.leaderboard?.mode === "disabled"
        ? []
        : ["Leaderboard"]),
      "FAQ",
      ...(hasResources ? ["Resources"] : []),
    ],
    [showQuickstart, hasResources],
  );

  const [copied, copyToClipboard] = useCopyToClipboard();
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  useEffect(() => {
    if (!tabs.includes(selectedTab)) setSelectedTab(tabs[0]);
  }, [tabs, selectedTab]);

  const shortLinkDomain = program.domain || "";
  const destinationDomain = program.url
    ? getDomainWithoutWWW(program.url)!
    : "";

  const partnerLink =
    links.length > 0
      ? constructPartnerLink({
          program,
          linkKey: links[0].key,
        })
      : undefined;

  return (
    <div
      style={{ backgroundColor: themeOptions.backgroundColor || "transparent" }}
      className={cn("flex flex-col", !dynamicHeight && "min-h-screen")}
    >
      <div className="relative z-0 p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground
            logo={program.logo}
            color={program.brandColor}
            embed
          />
          <span className="text-content-emphasis text-base font-semibold">
            Referral link
          </span>
          <div className="xs:flex-row xs:items-center relative mt-3 flex flex-col gap-2 sm:max-w-[50%]">
            <input
              type="text"
              readOnly
              value={
                partnerLink ? getPrettyUrl(partnerLink) : "No referral link"
              }
              className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 min-w-0 shrink grow rounded-md border px-3 text-sm focus:outline-none focus:ring-neutral-500"
            />
            {partnerLink ? (
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
                onClick={() => {
                  copyToClipboard(partnerLink);
                }}
              />
            ) : (
              <Button
                text="Create a link"
                onClick={() => {
                  setSelectedTab("Links");
                }}
                className="xs:w-fit"
              />
            )}
          </div>

          {partnerLink && program.linkStructure === "query" && (
            <QueryLinkStructureHelpText
              program={program}
              linkKey={links[0].key}
            />
          )}

          <div className="mt-12 sm:max-w-[50%]">
            <div className="flex items-end justify-between">
              <span className="text-content-emphasis text-base font-semibold leading-none">
                Rewards
              </span>
              {program.termsUrl && (
                <a
                  href={program.termsUrl}
                  target="_blank"
                  className="text-content-subtle text-xs font-medium leading-none underline-offset-2 hover:underline"
                >
                  View terms ↗
                </a>
              )}
            </div>
            <div className="text-content-emphasis relative mt-4 text-lg">
              <ProgramRewardList rewards={rewards} discount={discount} />
            </div>
          </div>
          <div className="mt-4 flex justify-center md:absolute md:bottom-3 md:right-3 md:mt-0">
            <a
              href="https://dub.co/partners"
              target="_blank"
              className="hover:text-content-default text-content-subtle bg-bg-default border-border-subtle flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 transition-colors duration-75"
            >
              <p className="whitespace-nowrap text-xs font-medium leading-none">
                Powered by
              </p>
              <Wordmark className="text-content-emphasis h-3.5" />
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <ReferralsEmbedActivity {...stats} />
          <ReferralsEmbedEarningsSummary
            earnings={earnings}
            programSlug={program.slug}
          />
        </div>
        <div className="mt-4">
          <div className="border-border-subtle flex items-center border-b">
            <TabSelect
              options={tabs.map((tab) => ({
                id: tab,
                label: tab,
              }))}
              selected={selectedTab}
              onSelect={(option) => {
                setSelectedTab(option);
              }}
              className="scrollbar-hide min-w-0 grow overflow-x-auto"
            />

            <div className="shrink">
              <Menu
                showQuickstart={showQuickstart}
                setShowQuickstart={(show) => {
                  setShowQuickstart(show);
                  if (show) setSelectedTab("Quickstart");
                }}
              />
            </div>
          </div>
          <div className="my-4">
            <AnimatePresence mode="wait">
              {selectedTab === "Quickstart" ? (
                <ReferralsEmbedQuickstart
                  program={program}
                  link={partnerLink ? links[0] : undefined}
                  hasResources={hasResources}
                  setSelectedTab={setSelectedTab}
                />
              ) : selectedTab === "Earnings" ? (
                <ReferralsEmbedEarnings salesCount={stats.sales} />
              ) : selectedTab === "Links" ? (
                <ReferralsEmbedLinks
                  links={links}
                  destinationDomain={destinationDomain}
                  shortLinkDomain={shortLinkDomain}
                />
              ) : selectedTab === "Leaderboard" &&
                programEmbedData?.leaderboard?.mode !== "disabled" ? (
                <ReferralsEmbedLeaderboard />
              ) : selectedTab === "FAQ" ? (
                <ReferralsEmbedFAQ program={program} reward={rewards[0]} />
              ) : selectedTab === "Resources" ? (
                <ReferralsEmbedResources resources={resources} />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <ReferralsReferralsEmbedToken />
      </div>
    </div>
  );
}

function Menu({
  showQuickstart,
  setShowQuickstart,
}: {
  showQuickstart: boolean;
  setShowQuickstart: (value: boolean) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="grid w-full grid-cols-1 gap-px p-2 sm:w-48">
          <Button
            text={`${showQuickstart ? "Hide" : "Show"} starting guide`}
            variant="outline"
            onClick={() => {
              setOpenPopover(false);
              setShowQuickstart(!showQuickstart);
            }}
            icon={<Directions className="size-4" />}
            className="h-9 justify-start px-2 font-medium"
          />
        </div>
      }
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="secondary"
        className={cn(
          "text-content-subtle h-8 px-1.5 outline-none transition-all duration-200",
          "data-[state=open]:border-border-emphasis sm:group-hover/card:data-[state=closed]:border-border-subtle border-transparent",
        )}
        icon={<ThreeDots className="size-4 shrink-0" />}
        onClick={() => {
          setOpenPopover(!openPopover);
        }}
      />
    </Popover>
  );
}
