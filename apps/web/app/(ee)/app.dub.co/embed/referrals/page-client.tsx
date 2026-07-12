"use client";

import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
import { TREMENDOUS_ENABLED_PROGRAM_IDS } from "@/lib/tremendous/constants";
import {
  DiscountProps,
  PartnerBountyProps,
  PartnerGroupProps,
  ProgramEnrollmentProps,
  RewardProps,
} from "@/lib/types";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { programEmbedSchema } from "@/lib/zod/schemas/program-embed";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { HeroBackground } from "@/ui/partners/hero-background";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { ProgramRewardTerms } from "@/ui/partners/program-reward-terms";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Check,
  Combobox,
  Copy,
  Directions,
  Popover,
  StatusBadge,
  TabSelect,
  useCopyToClipboard,
  useLocalStorage,
  Wordmark,
} from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/icons";
import {
  cn,
  getApexDomain,
  getPrettyUrl,
  TREMENDOUS_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import {
  Partner,
  PlatformType,
  Program,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import {
  createContext,
  CSSProperties,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ReferralsEmbedActivity } from "./activity";
import { ReferralsEmbedBounties } from "./bounties";
import { ReferralsEmbedEarnings } from "./earnings";
import { ReferralsEmbedEarningsSummary } from "./earnings-summary";
import { ReferralsEmbedFAQ } from "./faq";
import { ReferralsEmbedLeaderboard } from "./leaderboard";
import { ReferralsEmbedLinks } from "./links";
import { ReferralsEmbedQuickstart } from "./quickstart";
import { ReferralsEmbedResources } from "./resources";
import { ReferralsEmbedSettings } from "./settings";
import { ThemeOptions } from "./theme-options";
import { ReferralsReferralsEmbedToken } from "./token";
import { ReferralsEmbedLink } from "./types";

type ReferralsEmbedData = {
  program: Pick<
    Program,
    | "id"
    | "name"
    | "slug"
    | "domain"
    | "minPayoutAmount"
    | "termsUrl"
    | "embedData"
    | "resources"
  >;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt"> & {
    status: ProgramEnrollmentStatus;
  };
  partner: Pick<
    Partner,
    | "id"
    | "name"
    | "email"
    | "username"
    | "country"
    | "tremendousEmail"
    | "defaultPayoutMethod"
  >;
  partnerPlatforms: Array<{
    type: PlatformType;
    identifier: string;
    verifiedAt: Date | null;
  }>;
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
  links: ReferralsEmbedLink[];
  rewards: RewardProps[];
  discount?: DiscountProps | null;
  earnings: {
    upcoming: number;
    paid: number;
    totalCount: number;
  };
  stats: {
    clicks: number;
    leads: number;
    conversions: number;
  };
  bounties: PartnerBountyProps[];
};

type ReferralsEmbedPageClientProps = ReferralsEmbedData & {
  themeOptions: ThemeOptions;
  dynamicHeight: boolean;
};

const ReferralsEmbedDataContext = createContext<ReferralsEmbedData | null>(
  null,
);

export function useReferralsEmbedData() {
  const context = useContext(ReferralsEmbedDataContext);

  if (!context) {
    throw new Error(
      "useReferralsEmbedData must be used within ReferralsEmbedDataProvider",
    );
  }

  return context;
}

function ReferralsEmbedDataProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ReferralsEmbedData;
}) {
  return (
    <ReferralsEmbedDataContext.Provider value={value}>
      {children}
    </ReferralsEmbedDataContext.Provider>
  );
}

export function ReferralsEmbedPageClient({
  program,
  partner,
  partnerPlatforms,
  links,
  rewards,
  discount,
  earnings,
  stats,
  programEnrollment,
  group,
  bounties,
  themeOptions,
  dynamicHeight,
}: ReferralsEmbedPageClientProps) {
  const resources = programResourcesSchema.parse(
    program.resources ?? { logos: [], colors: [], files: [], links: [] },
  );

  const programEmbedData = programEmbedSchema.parse(program.embedData);

  const termsHref =
    (programEmbedData?.customTermsUrl || program.termsUrl) ?? undefined;

  const hasResources =
    resources && Object.values(resources).some((resource) => resource.length);

  const [showQuickstart, setShowQuickstart] = useLocalStorage(
    "referral-embed-show-quickstart",
    true,
  );

  const activeBountiesCount = bounties.length;
  const hasEmbedAccess = ACTIVE_ENROLLMENT_STATUSES.includes(
    programEnrollment.status,
  );

  const isTremendousCountrySupported = Boolean(
    !partner.country ||
      TREMENDOUS_SUPPORTED_COUNTRIES.includes(partner.country),
  );

  // Show Tremendous payout settings if the partner already uses Tremendous,
  // or hasn't selected a payout method yet and is eligible based on country.
  const showSettingsTab =
    TREMENDOUS_ENABLED_PROGRAM_IDS.includes(program.id) &&
    (partner.defaultPayoutMethod === "tremendous" ||
      (!partner.defaultPayoutMethod && isTremendousCountrySupported));

  const customerRewards = useMemo(
    () => rewards.filter((reward) => reward.event !== "referral"),
    [rewards],
  );

  const referralRewards = useMemo(
    () => rewards.filter((reward) => reward.event === "referral"),
    [rewards],
  );

  const showPartnerReferralSection =
    referralRewards.length > 0 && Boolean(partner.username);

  const tabs = useMemo(
    () => [
      ...(showQuickstart ? ["Quickstart"] : []),
      ...(activeBountiesCount > 0 ? ["Bounties"] : []),
      ...(!programEmbedData?.hideEarnings ? ["Earnings"] : []),
      ...(group.additionalLinks.length > 0 ? ["Links"] : []),
      ...(programEmbedData?.leaderboard?.mode === "disabled"
        ? []
        : ["Leaderboard"]),
      "FAQ",
      ...(hasResources ? ["Resources"] : []),
      ...(showSettingsTab ? ["Settings"] : []),
    ],
    [
      showQuickstart,
      activeBountiesCount,
      group.additionalLinks,
      programEmbedData,
      hasResources,
      showSettingsTab,
    ],
  );

  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  useEffect(() => {
    if (!tabs.includes(selectedTab)) setSelectedTab(tabs[0]);
  }, [tabs, selectedTab]);

  const embedData = useMemo(
    () => ({
      program,
      partner,
      partnerPlatforms,
      links,
      rewards,
      discount,
      earnings,
      stats,
      programEnrollment,
      group,
      bounties,
    }),
    [
      program,
      partner,
      partnerPlatforms,
      links,
      rewards,
      discount,
      earnings,
      stats,
      programEnrollment,
      group,
      bounties,
    ],
  );

  if (!hasEmbedAccess) {
    return (
      <ReferralsEmbedUnapproved
        status={programEnrollment.status}
        programName={program.name}
        themeOptions={themeOptions}
        dynamicHeight={dynamicHeight}
      />
    );
  }

  return (
    <ReferralsEmbedDataProvider value={embedData}>
      <div
        style={
          {
            backgroundColor: themeOptions.backgroundColor || "transparent",
            "--brand": group.brandColor || "#2563eb",
          } as CSSProperties
        }
        className={cn("flex flex-col", !dynamicHeight && "min-h-screen")}
      >
        <div className="relative z-0 p-5">
          <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
            <HeroBackground logo={group.logo} color={group.brandColor} embed />

            <ReferralLinkDisplay
              termsHref={termsHref}
              onSelectTab={setSelectedTab}
              hasPartnerReferralReward={showPartnerReferralSection}
            />

            <div
              className={cn(
                "sm:max-w-[50%]",
                !showPartnerReferralSection && "mt-12",
              )}
            >
              {!showPartnerReferralSection && (
                <div className="flex items-end justify-between">
                  <span className="text-content-emphasis text-base font-semibold leading-none">
                    Rewards
                  </span>
                  {termsHref && (
                    <a
                      href={termsHref}
                      target="_blank"
                      className="text-content-subtle text-xs font-medium leading-none underline-offset-2 hover:underline"
                    >
                      View terms ↗
                    </a>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "text-content-emphasis relative text-lg",
                  showPartnerReferralSection ? "mt-2" : "mt-4",
                )}
              >
                <ProgramRewardList
                  rewards={customerRewards}
                  discount={discount}
                  className="rounded-lg"
                />

                <ProgramRewardTerms
                  minPayoutAmount={
                    programEmbedData?.hideEarnings ? 0 : program.minPayoutAmount
                  }
                  holdingPeriodDays={
                    programEmbedData?.hideEarnings
                      ? 0
                      : group.holdingPeriodDays ?? 0
                  }
                />
              </div>
            </div>

            {showPartnerReferralSection && (
              <PartnerReferralLinkDisplay referralRewards={referralRewards} />
            )}

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
          <div
            className={cn(
              "mt-4 grid gap-2 sm:h-32 sm:grid-cols-3",
              programEmbedData?.hideEarnings
                ? "sm:grid-cols-1"
                : "sm:grid-cols-3",
            )}
          >
            <ReferralsEmbedActivity />
            {!programEmbedData?.hideEarnings && (
              <ReferralsEmbedEarningsSummary
                showSettingsTab={showSettingsTab}
                onSelectTab={setSelectedTab}
              />
            )}
          </div>
          <div className="mt-4">
            <div className="border-border-subtle flex items-center border-b">
              <TabSelect
                options={tabs.map((tab) => ({
                  id: tab,
                  label:
                    tab === "Bounties" ? (
                      <span className="flex items-center gap-2">
                        Bounties
                        <span
                          className={cn(
                            "flex h-5 items-center rounded-md px-1.5 text-xs font-medium",
                            "bg-[var(--brand)] text-white",
                          )}
                        >
                          {activeBountiesCount}
                        </span>
                      </span>
                    ) : (
                      tab
                    ),
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
                    hasResources={hasResources}
                    setSelectedTab={setSelectedTab}
                  />
                ) : selectedTab === "Bounties" ? (
                  <ReferralsEmbedBounties />
                ) : selectedTab === "Earnings" ? (
                  <ReferralsEmbedEarnings />
                ) : selectedTab === "Links" ? (
                  <ReferralsEmbedLinks />
                ) : selectedTab === "Leaderboard" &&
                  programEmbedData?.leaderboard?.mode !== "disabled" ? (
                  <ReferralsEmbedLeaderboard />
                ) : selectedTab === "FAQ" ? (
                  <ReferralsEmbedFAQ />
                ) : selectedTab === "Resources" ? (
                  <ReferralsEmbedResources resources={resources} />
                ) : selectedTab === "Settings" ? (
                  <ReferralsEmbedSettings />
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <ReferralsReferralsEmbedToken />
        </div>
      </div>
    </ReferralsEmbedDataProvider>
  );
}

function ReferralsEmbedUnapproved({
  status,
  programName,
  themeOptions,
  dynamicHeight,
}: {
  status: ProgramEnrollmentStatus;
  programName: string;
  themeOptions: ThemeOptions;
  dynamicHeight: boolean;
}) {
  const badge = PartnerStatusBadges[status];
  const isPending = status === "pending";

  return (
    <div
      style={{
        backgroundColor: themeOptions.backgroundColor || "transparent",
      }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        !dynamicHeight && "min-h-screen",
      )}
    >
      <StatusBadge
        variant={badge.variant}
        icon={badge.icon}
        className="px-1.5 py-0.5"
      >
        {badge.label}
      </StatusBadge>
      <h2 className="text-content-default mt-4 text-base font-semibold">
        {isPending ? "Application in review" : "Program unavailable"}
      </h2>
      <p className="text-content-subtle [&_strong]:text-content-default mt-2 max-w-sm text-balance text-sm font-medium [&_strong]:font-semibold">
        {isPending ? (
          <>
            You&apos;ll be notified when <strong>{programName}</strong> has
            finished reviewing your application.
          </>
        ) : (
          "You don't have access to this program."
        )}
      </p>
    </div>
  );
}

function ReferralLinkDisplay({
  onSelectTab,
  termsHref,
  hasPartnerReferralReward,
}: {
  onSelectTab: (tab: string) => void;
  termsHref: string | undefined;
  hasPartnerReferralReward: boolean;
}) {
  const { links, group } = useReferralsEmbedData();
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
        className="h-10 w-fit shrink-0 rounded-lg"
        onClick={() => copyToClipboard(partnerLink)}
      />
    );
  } else if (links.length === 0) {
    actionButton = (
      <Button
        text="Create a link"
        onClick={() => onSelectTab("Links")}
        className="h-10 w-fit shrink-0 rounded-lg"
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between sm:max-w-[50%]">
        <span className="text-content-emphasis text-base font-semibold">
          {hasPartnerReferralReward
            ? "Customer referral rewards"
            : "Referral link"}
        </span>
        {hasPartnerReferralReward && termsHref && (
          <a
            href={termsHref}
            target="_blank"
            className="text-content-subtle text-xs font-medium leading-none underline-offset-2 hover:underline"
          >
            View terms ↗
          </a>
        )}
      </div>

      <div className="xs:flex-row xs:items-center relative mt-2 flex flex-col gap-2 sm:max-w-[50%]">
        {links.length <= 1 ? (
          <input
            type="text"
            readOnly
            value={partnerLink ? getPrettyUrl(partnerLink) : "No referral link"}
            className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 min-w-0 grow rounded-lg border px-3 text-sm focus:outline-none focus:ring-0"
          />
        ) : (
          <div className="min-w-0 grow">
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
                  className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm outline-none focus:ring-0"
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
          </div>
        )}
        {actionButton}
      </div>

      {partnerLink && group.linkStructure === "query" && (
        <QueryLinkStructureHelpText link={selectedLink} className="mt-1.5" />
      )}
    </>
  );
}

function PartnerReferralLinkDisplay({
  referralRewards,
}: {
  referralRewards: RewardProps[];
}) {
  const { partner, program } = useReferralsEmbedData();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const partnerReferralApplyLink = constructPartnerReferralLink({
    partner,
    program,
  });

  return (
    <div className="mt-8 sm:max-w-[50%]">
      <span className="text-content-emphasis text-base font-semibold leading-none">
        Partner referral rewards
      </span>

      <div className="xs:flex-row xs:items-center relative mt-2 flex flex-col gap-2">
        <input
          type="text"
          readOnly
          value={getPrettyUrl(partnerReferralApplyLink)}
          className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-10 min-w-0 grow rounded-lg border px-3 text-sm focus:outline-none focus:ring-0"
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
          className="h-10 w-fit shrink-0 rounded-lg"
          onClick={() => copyToClipboard(partnerReferralApplyLink)}
        />
      </div>

      <div className="text-content-emphasis relative mt-2 text-lg">
        <ProgramRewardList rewards={referralRewards} className="rounded-lg" />
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
