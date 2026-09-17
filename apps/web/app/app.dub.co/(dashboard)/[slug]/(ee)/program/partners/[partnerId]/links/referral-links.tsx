"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { PARTNER_LEVEL_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import useGroup from "@/lib/swr/use-group";
import { useProgramPartnerLinks } from "@/lib/swr/use-program-partner-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { useAddPartnerLinkModal } from "@/ui/modals/add-partner-link-modal";
import { useEditPartnerDiscountModal } from "@/ui/modals/edit-partner-discount-modal";
import { useEditPartnerRewardModal } from "@/ui/modals/edit-partner-reward-modal";
import { useAdvancedUpsellModal } from "@/ui/partners/advanced-upsell-modal";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CardList,
  CursorRays,
  InvoiceDollar,
  LoadingSpinner,
  MenuItem,
  Popover,
  Receipt2,
  Tooltip,
  TooltipContent,
  UserCheck,
  useCopyToClipboard,
} from "@dub/ui";
import { Copy, Discount, DiscountCode } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  getPrettyUrl,
  nFormatter,
  pluralize,
} from "@dub/utils";
import { Command } from "cmdk";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];
type PartnerForOverrides = Pick<
  EnrolledPartnerProps,
  | "id"
  | "name"
  | "email"
  | "image"
  | "groupId"
  | "clickRewardId"
  | "leadRewardId"
  | "saleRewardId"
  | "discountId"
>;

const LINK_REWARD_OVERRIDE_EVENTS = ["click", "lead", "sale"] as const;

function getLinkRewardOverride(
  link: Pick<PartnerLink, "clickReward" | "leadReward" | "saleReward">,
) {
  return LINK_REWARD_OVERRIDE_EVENTS.filter((event) => {
    const reward = {
      click: link.clickReward,
      lead: link.leadReward,
      sale: link.saleReward,
    }[event];

    return Boolean(reward);
  });
}

function getLinkRewardOverrideTooltip(
  events: ReturnType<typeof getLinkRewardOverride>,
) {
  if (events.length === 1) {
    return `This link has a ${events[0]} reward override`;
  }

  if (events.length === 2) {
    return `This link has ${events[0]} and ${events[1]} reward overrides`;
  }

  return `This link has ${events.slice(0, -1).join(", ")}, and ${events.at(-1)} reward overrides`;
}

const formatStatCount = ({ count, unit }: { count: number; unit: string }) => ({
  count,
  formatted: nFormatter(count),
  tooltip: `${nFormatter(count, { full: true })} ${pluralize(unit, count)}`,
});

const PARTNER_LINK_STATS = [
  {
    id: "clicks",
    icon: CursorRays,
    event: "clicks",
    iconClassName: "data-[active=true]:text-blue-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.clicks,
        unit: "click",
      }),
  },
  {
    id: "leads",
    icon: UserCheck,
    event: "leads",
    iconClassName: "data-[active=true]:text-purple-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.leads,
        unit: "lead",
      }),
  },
  {
    id: "conversions",
    icon: Receipt2,
    event: "sales",
    iconClassName: "data-[active=true]:text-orange-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.conversions,
        unit: "conversion",
      }),
  },
  {
    id: "revenue",
    icon: InvoiceDollar,
    event: "sales",
    iconClassName: "data-[active=true]:text-teal-500",
    getValue: (link: PartnerLink) => {
      const count = link.saleAmount;
      const formatted =
        count > 0
          ? currencyFormatter(count, {
              trailingZeroDisplay: "stripIfInteger",
            })
          : nFormatter(count);

      return {
        count,
        formatted,
        tooltip: `${formatted} revenue`,
      };
    },
  },
] as const;

export function ReferralLinks({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();

  const { group } = useGroup({
    groupIdOrSlug: partner.groupId ?? undefined,
  });

  const { AddPartnerLinkModal, setShowAddPartnerLinkModal } =
    useAddPartnerLinkModal({
      partner,
    });

  const { links, loading, error } = useProgramPartnerLinks({
    partnerId: partner.id,
  });

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">
          Referral links
        </h2>
        <Button
          variant="secondary"
          text="Create link"
          className="h-8 w-fit rounded-lg px-3 py-2 font-medium"
          onClick={() => setShowAddPartnerLinkModal(true)}
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-content-subtle rounded-xl border border-neutral-200 py-8 text-center text-sm">
          Failed to load partner links
        </div>
      ) : links && links.length > 0 ? (
        <CardList variant="compact">
          {links.map((link) => (
            <PartnerLinkCard
              key={link.id}
              link={link}
              partner={partner}
              group={group}
              slug={slug}
            />
          ))}
        </CardList>
      ) : (
        <div className="text-content-subtle rounded-xl border border-neutral-200 py-8 text-center text-sm">
          No links created
        </div>
      )}
      <AddPartnerLinkModal />
    </>
  );
}

function PartnerLinkCard({
  link,
  partner,
  group,
  slug,
}: {
  link: PartnerLink;
  partner: PartnerForOverrides;
  group?: GroupProps | null;
  slug?: string;
}) {
  const { plan } = useWorkspace();
  const { canUseAdvancedRewardLogic } = getPlanCapabilities(plan);
  const { advancedUpsellModal, setShowAdvancedUpsellModal } =
    useAdvancedUpsellModal();

  const partnerLink = constructPartnerLink({
    group,
    link,
  });
  const rewardEvents = getLinkRewardOverride(link);
  const [rewardEvent, setRewardEvent] = useState<"sale" | "lead" | "click">(
    "sale",
  );

  const { EditPartnerRewardModal, setShowEditPartnerRewardModal } =
    useEditPartnerRewardModal({
      event: rewardEvent,
      target: { type: "link", link, partner },
      group,
    });

  const { EditPartnerDiscountModal, setShowEditPartnerDiscountModal } =
    useEditPartnerDiscountModal({
      target: { type: "link", link, partner },
      group,
    });

  const overrideDisabledTooltip = !canUseAdvancedRewardLogic ? (
    <TooltipContent
      title={PARTNER_LEVEL_REWARDS_PLAN_ERROR}
      cta="Upgrade to Advanced"
      onClick={() => setShowAdvancedUpsellModal(true)}
    />
  ) : undefined;

  return (
    <>
      {advancedUpsellModal}
      <CardList.Card
        innerClassName="flex items-center justify-between gap-4 px-3 py-2.5"
        hoverStateEnabled={false}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/${slug}/links/${link.domain}/${link.key}`}
            target="_blank"
            className="text-content-default cursor-alias truncate text-sm font-medium decoration-dotted hover:underline"
          >
            {getPrettyUrl(partnerLink)}
          </Link>
          {rewardEvents.length > 0 && (
            <Tooltip
              content={
                <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                  {getLinkRewardOverrideTooltip(rewardEvents)}
                </div>
              }
            >
              <div className="flex h-5 shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-1">
                {rewardEvents.map((event) => {
                  const Icon = REWARD_EVENT_ICON[event];
                  return (
                    <Icon key={event} className="size-3 text-neutral-700" />
                  );
                })}
              </div>
            </Tooltip>
          )}
          {link.discount && (
            <Tooltip
              content={
                <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                  This link has a discount override
                </div>
              }
            >
              <div className="flex h-5 shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-1">
                <DiscountCode className="size-3 text-neutral-700" />
              </div>
            </Tooltip>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {PARTNER_LINK_STATS.map(
            ({ id, icon: Icon, event, getValue, iconClassName }) => {
              const { count, formatted, tooltip } = getValue(link);

              return (
                <Tooltip
                  key={id}
                  content={
                    <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                      {tooltip}
                    </div>
                  }
                >
                  <Link
                    href={`/${slug}/events?event=${event}&interval=all&domain=${link.domain}&key=${link.key}`}
                    target="_blank"
                    className="flex items-center gap-1.5"
                  >
                    <Icon
                      data-active={count > 0}
                      className={cn(
                        "size-4 shrink-0 text-neutral-400",
                        iconClassName,
                      )}
                    />
                    <span className="text-xs font-medium text-neutral-700">
                      {formatted}
                    </span>
                  </Link>
                </Tooltip>
              );
            },
          )}

          <PartnerLinkCardMenu
            partnerLink={partnerLink}
            overrideDisabledTooltip={overrideDisabledTooltip}
            onEditReward={(event) => {
              setRewardEvent(event);
              setShowEditPartnerRewardModal(true);
            }}
            onEditDiscount={() => setShowEditPartnerDiscountModal(true)}
          />
        </div>
      </CardList.Card>
      <EditPartnerRewardModal />
      <EditPartnerDiscountModal />
    </>
  );
}

function PartnerLinkCardMenu({
  partnerLink,
  onEditReward,
  onEditDiscount,
  overrideDisabledTooltip,
}: {
  partnerLink: string;
  onEditReward: (event: "sale" | "lead" | "click") => void;
  onEditDiscount: () => void;
  overrideDisabledTooltip?: ReactNode;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(partnerLink), {
                  success: "Copied to clipboard",
                });
                setOpenPopover(false);
              }}
            >
              Copy link
            </MenuItem>
            {(["sale", "lead", "click"] as const).map((event) => {
              const Icon = REWARD_EVENT_ICON[event];
              return (
                <MenuItem
                  key={event}
                  as={Command.Item}
                  icon={Icon}
                  disabledTooltip={overrideDisabledTooltip}
                  onSelect={() => {
                    setOpenPopover(false);
                    onEditReward(event);
                  }}
                >
                  Edit {event} reward
                </MenuItem>
              );
            })}
            <MenuItem
              as={Command.Item}
              icon={Discount}
              disabledTooltip={overrideDisabledTooltip}
              onSelect={() => {
                setOpenPopover(false);
                onEditDiscount();
              }}
            >
              Edit discount
            </MenuItem>
          </Command.List>
        </Command>
      }
    >
      <Button
        type="button"
        variant="outline"
        className="size-6 shrink-0 rounded-lg p-0"
        icon={<ThreeDots className="size-3.5 shrink-0" />}
      />
    </Popover>
  );
}
