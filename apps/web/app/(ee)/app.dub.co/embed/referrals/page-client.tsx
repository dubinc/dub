"use client";

import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { QueryLinkStructureHelpText } from "@/lib/partners/query-link-structure-help-text";
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
import { LinkIcon } from "@/ui/links/link-icon";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { HeroBackground } from "@/ui/partners/hero-background";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { ProgramRewardModifiersTooltip } from "@/ui/partners/program-reward-modifiers-tooltip";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Check,
  Combobox,
  Copy,
  Directions,
  Gift,
  Popover,
  StatusBadge,
  TabSelect,
  useCopyToClipboard,
  useLocalStorage,
  Wordmark,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  getPrettyUrl,
  pluralize,
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
  Fragment,
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

  const hasFAQ = !programEmbedData?.faq || programEmbedData.faq.length > 0;

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

  // Show Tremendous payout settings if the partner already uses Tremendous for payouts,
  // or hasn't selected a payout method yet and is eligible based on country.
  const showSettingsTab =
    partner.defaultPayoutMethod === "tremendous" ||
    (!partner.defaultPayoutMethod && isTremendousCountrySupported);

  const tabs = useMemo(
    () => [
      ...(showQuickstart ? ["Quickstart"] : []),
      ...(activeBountiesCount > 0 ? ["Bounties"] : []),
      ...(!programEmbedData?.hideEarnings ? ["Earnings"] : []),
      ...(group.additionalLinks.length > 0 ? ["Links"] : []),
      ...(programEmbedData?.leaderboard?.mode === "disabled"
        ? []
        : ["Leaderboard"]),
      ...(hasFAQ ? ["FAQ"] : []),
      ...(hasResources ? ["Resources"] : []),
      ...(showSettingsTab ? ["Settings"] : []),
    ],
    [
      showQuickstart,
      activeBountiesCount,
      group.additionalLinks,
      programEmbedData,
      hasFAQ,
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

            <EmbedRewardsSection
              termsHref={termsHref}
              onSelectTab={setSelectedTab}
              hideEarningsTerms={Boolean(programEmbedData?.hideEarnings)}
            />

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

function EmbedRewardsSection({
  termsHref,
  onSelectTab,
  hideEarningsTerms,
}: {
  termsHref: string | undefined;
  onSelectTab: (tab: string) => void;
  hideEarningsTerms: boolean;
}) {
  const { links, group, rewards, partner, program } = useReferralsEmbedData();
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(
    links[0]?.id ?? null,
  );

  const selectedLink =
    links.find((link) => link.id === selectedLinkId) ?? links[0] ?? null;

  const referralRewards = rewards.filter(
    (reward) => reward.event === "referral" && getRewardAmount(reward) >= 0,
  );
  const hasPartnerReferralReward =
    referralRewards.length > 0 && Boolean(partner.username);

  const customerRewards = [
    selectedLink?.clickReward,
    selectedLink?.leadReward,
    selectedLink?.saleReward,
    ...rewards.filter((reward) => reward.event === "custom"),
  ].filter(
    (reward): reward is RewardProps =>
      reward != null && getRewardAmount(reward) >= 0,
  );
  const resolvedDiscount = selectedLink?.discount ?? null;

  const partnerLink = selectedLink
    ? constructPartnerLink({ group, link: selectedLink })
    : "";
  const hasPartnerLink = Boolean(partnerLink);

  const partnerReferralApplyLink = constructPartnerReferralLink({
    partner,
    program,
  });

  const linkOptions =
    links.length > 1
      ? links.map((link) => {
          const href = constructPartnerLink({ group, link });

          return {
            value: link.id,
            label: href ? getPrettyUrl(href) : getPrettyUrl(link.shortLink),
            icon: (
              <LinkIcon
                url={link.url}
                domain={link.domain}
                linkKey={link.key}
              />
            ),
          };
        })
      : undefined;

  const selectedOption =
    linkOptions?.find((option) => option.value === selectedLink?.id) ?? null;

  const customerRewardItems = [
    ...customerRewards.map((reward) => ({
      id: reward.id,
      icon: REWARD_EVENT_ICON[reward.event],
      text: (
        <>
          {formatRewardDescription(reward, { includeEarnPrefix: false })}
          {(!!reward.modifiers?.length ||
            Boolean(reward.tooltipDescription)) && (
            <>
              {" "}
              <ProgramRewardModifiersTooltip reward={reward} />
            </>
          )}
        </>
      ),
    })),
    ...(resolvedDiscount
      ? [
          {
            id: "discount",
            icon: Gift,
            text: formatDiscountDescription(resolvedDiscount),
          },
        ]
      : []),
  ];

  const showPayoutTerms =
    !hideEarningsTerms &&
    (program.minPayoutAmount > 0 || (group.holdingPeriodDays ?? 0) > 0);

  const customerRewardsList =
    customerRewardItems.length > 0 ? (
      <div className="border-border-subtle bg-bg-default space-y-4 rounded-lg border p-3">
        {customerRewardItems.map((reward) => {
          const RewardIcon = reward.icon;

          return (
            <div key={reward.id} className="flex items-center gap-2">
              <RewardIcon className="text-content-default size-4 shrink-0" />
              <div className="text-content-default min-w-0 text-sm font-medium leading-5 tracking-tight">
                {reward.text}
              </div>
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="relative z-10 flex flex-col gap-8 sm:max-w-[50%]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-content-emphasis text-base font-semibold tracking-tight">
            {hasPartnerReferralReward
              ? "Customer referral links"
              : "Referral link"}
          </h3>
          {termsHref && (
            <a
              href={termsHref}
              target="_blank"
              className="text-content-subtle shrink-0 text-xs font-medium leading-none underline-offset-2 hover:underline"
            >
              View terms ↗
            </a>
          )}
        </div>

        <EmbedLinkRow
          displayText={
            hasPartnerLink ? getPrettyUrl(partnerLink) : "No referral link"
          }
          copyValue={partnerLink}
          showLinkSelector={Boolean(linkOptions)}
          linkOptions={linkOptions}
          selectedOption={selectedOption}
          onSelectLink={(id) => {
            setSelectedLinkId(id);
            const link = links.find((item) => item.id === id);
            if (!link) return undefined;
            return constructPartnerLink({ group, link });
          }}
          onCreateLink={() => onSelectTab("Links")}
        />

        {hasPartnerLink && group.linkStructure === "query" && selectedLink && (
          <QueryLinkStructureHelpText link={selectedLink} />
        )}

        {showPayoutTerms ? (
          <div className="border-border-subtle bg-bg-muted overflow-hidden rounded-lg border">
            {customerRewardsList}
            <EmbedPayoutTerms
              minPayoutAmount={program.minPayoutAmount}
              holdingPeriodDays={group.holdingPeriodDays ?? 0}
            />
          </div>
        ) : (
          customerRewardsList
        )}
      </div>

      {hasPartnerReferralReward && (
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-base font-semibold tracking-tight">
            Partner referral rewards
          </h3>

          <EmbedLinkRow
            displayText={getPrettyUrl(partnerReferralApplyLink)}
            copyValue={partnerReferralApplyLink}
          />

          {referralRewards.length > 0 && (
            <div className="border-border-subtle bg-bg-default space-y-4 rounded-lg border p-3">
              {referralRewards.map((reward) => {
                const RewardIcon = REWARD_EVENT_ICON.referral;

                return (
                  <div key={reward.id} className="flex items-start gap-2">
                    <div className="flex items-center py-0.5">
                      <RewardIcon className="text-content-default size-4 shrink-0" />
                    </div>
                    <div className="text-content-default min-w-0 text-sm font-medium leading-5 tracking-tight">
                      {formatRewardDescription(reward)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmbedPayoutTerms({
  minPayoutAmount,
  holdingPeriodDays,
}: {
  minPayoutAmount: number;
  holdingPeriodDays: number;
}) {
  const items = [
    ...(minPayoutAmount > 0
      ? [
          {
            label: "Minimum payout",
            value: currencyFormatter(minPayoutAmount, {
              trailingZeroDisplay: "stripIfInteger",
            }),
            href: "https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean",
          },
        ]
      : []),
    ...(holdingPeriodDays > 0
      ? [
          {
            label: "holding period",
            value: `${holdingPeriodDays} ${pluralize("day", holdingPeriodDays)}`,
            href: "https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean",
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="text-content-subtle flex flex-wrap items-center gap-1.5 px-3 py-2 text-xs tracking-tight">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && (
            <span className="text-content-default font-semibold">•</span>
          )}
          <span className="inline-flex items-center gap-0.5">
            <span className="text-content-default font-semibold">
              {item.value}
            </span>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline decoration-dotted underline-offset-2"
            >
              {item.label}
            </a>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function EmbedLinkRow({
  displayText,
  copyValue,
  showLinkSelector,
  linkOptions,
  selectedOption,
  onSelectLink,
  onCreateLink,
}: {
  displayText: string;
  copyValue: string;
  showLinkSelector?: boolean;
  linkOptions?: {
    value: string;
    label: string;
    icon: ReactNode;
  }[];
  selectedOption?: {
    value: string;
    label: string;
    icon: ReactNode;
  } | null;
  onSelectLink?: (id: string) => string | void | undefined;
  onCreateLink?: () => void;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const hasLink = Boolean(copyValue);

  return (
    <div className="flex items-center gap-2">
      {showLinkSelector ? (
        <div className="min-w-0 grow">
          <Combobox
            selected={selectedOption ?? null}
            setSelected={(option) => {
              if (!option) return;
              const valueToCopy = onSelectLink?.(option.value);
              if (typeof valueToCopy === "string" && valueToCopy) {
                copyToClipboard(valueToCopy);
              }
            }}
            options={linkOptions}
            forceDropdown
            matchTriggerWidth
            placeholder="No referral link"
            inputClassName="text-sm h-9"
            popoverProps={{
              contentClassName: "rounded-lg border border-border-subtle p-1",
            }}
            trigger={
              <button
                type="button"
                className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm outline-none focus:ring-0"
              >
                <span className="min-w-0 shrink grow truncate font-medium">
                  {displayText}
                </span>
                <ChevronDown className="text-content-muted size-3 shrink-0" />
              </button>
            }
          />
        </div>
      ) : (
        <input
          type="text"
          readOnly
          value={displayText}
          className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default h-9 min-w-0 grow rounded-lg border px-3 text-sm font-medium focus:outline-none focus:ring-0"
        />
      )}

      {hasLink ? (
        <Button
          icon={
            <span className="relative size-4">
              <Copy
                className={cn(
                  "absolute inset-0 size-4 transition-[transform,opacity]",
                  copied && "translate-y-1 opacity-0",
                )}
              />
              <Check
                className={cn(
                  "absolute inset-0 size-4 transition-[transform,opacity]",
                  !copied && "translate-y-1 opacity-0",
                )}
              />
            </span>
          }
          text={copied ? "Copied" : "Copy"}
          className="h-9 w-fit shrink-0 rounded-lg px-4"
          onClick={() => copyToClipboard(copyValue)}
        />
      ) : onCreateLink ? (
        <Button
          text="Create a link"
          onClick={onCreateLink}
          className="h-9 w-fit shrink-0 rounded-lg px-4"
        />
      ) : null}
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
