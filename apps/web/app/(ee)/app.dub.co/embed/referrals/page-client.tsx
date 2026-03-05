"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
import { DiscountProps, PartnerGroupProps, RewardProps } from "@/lib/types";
import { programEmbedSchema } from "@/lib/zod/schemas/program-embed";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { ProgramRewardTerms } from "@/ui/partners/program-reward-terms";
import { ThreeDots } from "@/ui/shared/icons";
import { Partner, Program } from "@dub/prisma/client";
import {
  Button,
  Check,
  Combobox,
  Copy,
  Directions,
  Popover,
  TabSelect,
  useCopyToClipboard,
  useLocalStorage,
  Wordmark,
} from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/icons";
import { cn, getApexDomain, getPrettyUrl } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ReferralsEmbedActivity } from "./activity";
import { ReferralsEmbedEarnings } from "./earnings";
import { ReferralsEmbedEarningsSummary } from "./earnings-summary";
import { ReferralsEmbedFAQ } from "./faq";
import { ReferralsEmbedLeaderboard } from "./leaderboard";
import { ReferralsEmbedLinks } from "./links";
import { ReferralsEmbedQuickstart } from "./quickstart";
import { ReferralsEmbedResources } from "./resources";
import { ThemeOptions } from "./theme-options";
import { ReferralsReferralsEmbedToken } from "./token";
import { ReferralsEmbedLink } from "./types";

export function ReferralsEmbedPageClient({
  program,
  partner,
  links,
  rewards,
  discount,
  earnings,
  stats,
  group,
  themeOptions,
  dynamicHeight,
}: {
  program: Program;
  partner: Pick<Partner, "id" | "name" | "email">;
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
  group: Pick<
    PartnerGroupProps,
    | "id"
    | "logo"
    | "wordmark"
    | "brandColor"
    | "additionalLinks"
    | "maxPartnerLinks"
    | "linkStructure"
    | "holdingPeriodDays"
  >;
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
      ...(group.additionalLinks.length > 0 ? ["Links"] : []),
      ...(programEmbedData?.leaderboard?.mode === "disabled"
        ? []
        : ["Leaderboard"]),
      "FAQ",
      ...(hasResources ? ["Resources"] : []),
    ],
    [showQuickstart, group.additionalLinks, programEmbedData, hasResources],
  );

  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  useEffect(() => {
    if (!tabs.includes(selectedTab)) setSelectedTab(tabs[0]);
  }, [tabs, selectedTab]);

  return (
    <div
      style={{ backgroundColor: themeOptions.backgroundColor || "transparent" }}
      className={cn("flex flex-col", !dynamicHeight && "min-h-screen")}
    >
      <div className="relative z-0 p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground logo={group.logo} color={group.brandColor} embed />

          <ReferralLinkDisplay
            links={links}
            group={group}
            onSelectTab={setSelectedTab}
          />

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
              <ProgramRewardTerms
                minPayoutAmount={program.minPayoutAmount}
                holdingPeriodDays={group.holdingPeriodDays ?? 0}
              />
            </div>
          </div>
          {!programEmbedData?.hidePoweredByBadge && (
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
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <ReferralsEmbedActivity color={group.brandColor} {...stats} />
          <ReferralsEmbedEarningsSummary
            earnings={earnings}
            programSlug={program.slug}
            partnerEmail={partner.email}
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
                  group={group}
                  links={links}
                  earnings={earnings}
                  hasResources={hasResources}
                  setSelectedTab={setSelectedTab}
                />
              ) : selectedTab === "Earnings" ? (
                <ReferralsEmbedEarnings salesCount={stats.sales} />
              ) : selectedTab === "Links" ? (
                <ReferralsEmbedLinks
                  program={program}
                  links={links}
                  group={group}
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

function ReferralLinkDisplay({
  links,
  group,
  onSelectTab,
}: {
  links: ReferralsEmbedLink[];
  group: Pick<
    PartnerGroupProps,
    | "id"
    | "logo"
    | "wordmark"
    | "brandColor"
    | "additionalLinks"
    | "maxPartnerLinks"
    | "linkStructure"
    | "holdingPeriodDays"
  >;
  onSelectTab: (tab: string) => void;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(
    links[0]?.id ?? null,
  );

  const selectedLink = useMemo(
    () => links.find((l) => l.id === selectedLinkId) ?? links[0],
    [links, selectedLinkId],
  );

  const partnerLink = selectedLink
    ? constructPartnerLink({ group, link: selectedLink })
    : undefined;

  const options = useMemo(
    () =>
      links.map((link) => ({
        value: link.id,
        label: getPrettyUrl(constructPartnerLink({ group, link })),
        meta: {
          destination: link.url ? getApexDomain(link.url) : null,
        },
      })),
    [links, group],
  );

  const selectedOption =
    selectedLink && partnerLink
      ? {
          value: selectedLink.id,
          label: getPrettyUrl(partnerLink),
          meta: {
            destination: selectedLink.url
              ? getApexDomain(selectedLink.url)
              : null,
          },
        }
      : null;

  let actionButton: React.ReactNode = null;

  if (partnerLink) {
    actionButton = (
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
        onClick={() => copyToClipboard(partnerLink)}
      />
    );
  } else if (links.length === 0) {
    actionButton = (
      <Button
        text="Create a link"
        onClick={() => onSelectTab("Links")}
        className="xs:w-fit"
      />
    );
  }

  return (
    <>
      <span className="text-content-emphasis text-base font-semibold">
        Referral link
      </span>
      <div className="xs:flex-row xs:items-center relative mt-3 flex flex-col gap-2 sm:max-w-[50%]">
        {links.length <= 1 ? (
          <>
            <input
              type="text"
              readOnly
              value={
                partnerLink ? getPrettyUrl(partnerLink) : "No referral link"
              }
              className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 min-w-0 shrink grow rounded-md border px-3 text-sm focus:outline-none focus:ring-neutral-500"
            />
            {actionButton}
          </>
        ) : (
          <>
            <Combobox
              selected={selectedOption}
              setSelected={(option) => {
                if (!option) return;

                setSelectedLinkId(option.value);

                const link = links.find((l) => l.id === option.value);

                if (link) {
                  copyToClipboard(constructPartnerLink({ group, link }));
                }
              }}
              options={options}
              forceDropdown
              matchTriggerWidth
              placeholder="No referral link"
              inputClassName="text-sm h-10"
              optionDescription={(option) => (
                <span className="flex min-w-0 items-center gap-1">
                  <ArrowTurnRight2 className="text-content-muted size-3 shrink-0" />
                  <span className="text-content-subtle min-w-0 truncate text-xs">
                    {option.meta.destination}
                  </span>
                </span>
              )}
              popoverProps={{
                contentClassName: "rounded-lg border border-border-subtle p-1",
              }}
              trigger={
                <button
                  type="button"
                  className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default flex h-10 min-w-0 shrink grow items-center gap-2 rounded-md border px-3 text-left text-sm outline-none focus:ring-neutral-500"
                >
                  <span className="min-w-0 shrink grow truncate">
                    {partnerLink
                      ? getPrettyUrl(partnerLink)
                      : "No referral link"}
                  </span>
                  <ChevronDown className="text-content-muted size-4 shrink-0" />
                </button>
              }
            />
            {actionButton}
          </>
        )}
      </div>

      {partnerLink && group.linkStructure === "query" && (
        <QueryLinkStructureHelpText link={selectedLink} />
      )}
    </>
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
