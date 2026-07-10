"use client";

import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerNetworkInvitesUsage from "@/lib/swr/use-partner-network-invites-usage";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PartnerStarButton } from "@/ui/partners/partner-star-button";
import { TrustedPartnerBadge } from "@/ui/partners/trusted-partner-badge";
import {
  BadgeCheck2,
  Button,
  DynamicTooltipWrapper,
  Tooltip,
  UserPlus,
  useResizeObserver,
  useRouterStuff,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { ChartActivity2, EnvelopeArrowRight, Globe } from "@dub/ui/icons";
import {
  COUNTRIES,
  cn,
  isClickOnInteractiveChild,
  isWorkspaceBillingTrialActive,
  timeAgo,
} from "@dub/utils";
import { EmailContent } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-email-preview";
import { InviteNetworkPartnerSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-network-partner-sheet";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function NetworkPartnerCard({
  partner,
  onToggleStarred,
}: {
  partner?: NetworkPartnerProps;
  onToggleStarred?: (starred: boolean) => void;
}) {
  const { slug: workspaceSlug } = useWorkspace();
  const { queryParams } = useRouterStuff();
  const pathname = usePathname();

  const showInvite =
    !!partner &&
    !partner.invitedAt &&
    !partner.recruitedAt &&
    !pathname.endsWith("/ignored");

  const basicFields = useMemo(
    () => [
      {
        id: "country",
        icon: partner?.country ? (
          <img
            alt={`Flag of ${COUNTRIES[partner.country]}`}
            src={`https://flag.vercel.app/m/${partner.country}.svg`}
            className="size-3.5 rounded-full"
          />
        ) : (
          <Globe className="size-3.5 shrink-0" />
        ),
        text: partner
          ? partner.country
            ? COUNTRIES[partner.country]
            : "Planet Earth"
          : undefined,
      },
      {
        id: "joinedAt",
        icon: <ChartActivity2 className="size-3.5 shrink-0" />,
        text: partner
          ? `Joined ${timeAgo(partner.createdAt, { withAgo: true })}`
          : undefined,
      },
    ],
    [partner],
  );

  const partnerPlatformsData = useMemo(
    () =>
      partner
        ? PARTNER_PLATFORM_FIELDS.map((field) => ({
            label: field.label,
            icon: field.icon,
            ...field.data(partner.platforms),
          })).sort((a, b) => getPlatformSortOrder(a) - getPlatformSortOrder(b))
        : null,
    [partner],
  );

  const categoriesData = useMemo(() => {
    if (!partner) return undefined;
    if (partner.categories.length) {
      return partner.categories.map((category) => ({
        label: category.replace(/_/g, " "),
      }));
    }
    return [];
  }, [partner]);

  return (
    <div
      className={cn(
        partner?.id &&
          "hover:drop-shadow-card-hover cursor-pointer transition-[filter]",
      )}
      onClick={(e) => {
        if (!partner?.id || isClickOnInteractiveChild(e)) return;
        if (partner.recruitedAt || partner.invitedAt) {
          window.open(
            `/${workspaceSlug}/program/partners/${partner.id}`,
            "_blank",
          );
        } else {
          queryParams({ set: { partnerId: partner.id } });
        }
      }}
    >
      {(partner?.invitedAt || partner?.recruitedAt) && (
        <div className="bg-bg-subtle border-border-subtle -mb-3 flex items-center justify-center gap-2 rounded-t-xl border-x border-t p-2 pb-5">
          {partner.recruitedAt ? (
            <UserPlus className="text-content-default size-4 shrink-0" />
          ) : (
            <EnvelopeArrowRight className="text-content-default size-4 shrink-0" />
          )}

          <span className="text-content-emphasis text-sm font-medium">
            {partner.recruitedAt
              ? `Recruited ${timeAgo(partner.recruitedAt, { withAgo: true })}`
              : `Sent ${timeAgo(partner.invitedAt, { withAgo: true })}`}
          </span>
        </div>
      )}
      <div className="border-border-subtle rounded-xl border bg-white">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="relative w-fit">
              {partner ? (
                <PartnerAvatar
                  partner={partner}
                  className="size-16 border border-neutral-100"
                />
              ) : (
                <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
              )}
              {partner?.networkStatus === "trusted" && (
                <TrustedPartnerBadge size="large" />
              )}
            </div>

            {partner && (onToggleStarred || showInvite) && (
              <NetworkPartnerCardActions
                partner={partner}
                onToggleStarred={onToggleStarred}
                showInvite={showInvite}
              />
            )}
          </div>

          <div className="mt-3.5 flex flex-col gap-3">
            {partner ? (
              <span className="text-content-emphasis text-base font-semibold">
                {partner.name}
              </span>
            ) : (
              <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
            )}

            <div className="flex flex-col items-start gap-1">
              {basicFields
                .filter(({ text }) => text !== null)
                .map(({ id, icon, text }) => (
                  <div key={id}>
                    <div className="text-content-subtle flex cursor-default items-center gap-2">
                      {text !== undefined ? (
                        <>
                          {icon}
                          <span className="text-xs font-medium">{text}</span>
                        </>
                      ) : (
                        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <ListRow items={categoriesData} />
          </div>
        </div>
        <div className="border-border-subtle border-t p-4 pt-2">
          <span className="text-content-emphasis text-sm font-semibold">
            Audience
          </span>

          <div
            className={cn(
              "mt-2 grid grid-cols-6 gap-1",
              !partner && "animate-pulse",
            )}
          >
            {partnerPlatformsData
              ? partnerPlatformsData.map(
                  ({
                    label,
                    icon: PlatformIcon,
                    verified,
                    stat,
                    value,
                    href,
                    info,
                    verifiedAt,
                  }) => (
                    <PlatformStatCard
                      key={label}
                      label={label}
                      icon={PlatformIcon}
                      verified={verified}
                      stat={stat}
                      value={value}
                      info={info}
                      verifiedAt={verifiedAt}
                      href={verified && href ? href : undefined}
                    />
                  ),
                )
              : [...Array(6)].map((_, idx) => (
                  <div key={idx} className="bg-bg-subtle h-10 rounded-lg" />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPlatformSortOrder({
  verified,
  value,
}: {
  verified: boolean;
  value?: string | null;
}) {
  if (verified) return 0;
  if (value) return 1;
  return 2;
}

function NetworkPartnerCardActions({
  partner,
  onToggleStarred,
  showInvite,
}: {
  partner: NetworkPartnerProps;
  onToggleStarred?: (starred: boolean) => void;
  showInvite: boolean;
}) {
  const { trialEndsAt } = useWorkspace();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmailContent, setInviteEmailContent] =
    useState<EmailContent | null>(null);

  const { remaining: remainingInvites } = usePartnerNetworkInvitesUsage();
  const atNetworkInviteLimit = remainingInvites === 0;
  const disabled = atNetworkInviteLimit && !trialActive;

  const handleInvitePress = () => {
    if (trialActive && atNetworkInviteLimit) {
      openTrialLimitModal("networkInvites");
      return;
    }
    setShowInviteSheet(true);
  };

  return (
    <>
      <TrialLimitActivateModal />
      <InviteNetworkPartnerSheet
        nested
        isOpen={showInviteSheet}
        setIsOpen={setShowInviteSheet}
        partner={partner}
        emailContent={inviteEmailContent}
        onEmailContentChange={setInviteEmailContent}
        onSuccess={() => {
          mutatePrefix("/api/network/partners");
        }}
        {...(trialActive && {
          onInviteLimitError: () => openTrialLimitModal("networkInvites"),
        })}
      />
      <div className="flex items-center gap-2">
        {onToggleStarred && (
          <PartnerStarButton
            partner={partner}
            onToggleStarred={onToggleStarred}
            className="size-8"
            iconSize="size-3.5"
          />
        )}
        {showInvite && (
          <Button
            type="button"
            variant="primary"
            text="Invite"
            disabled={disabled}
            onClick={handleInvitePress}
            className="h-8 rounded-lg px-3"
          />
        )}
      </div>
    </>
  );
}

function PlatformStatCard({
  label,
  icon: PlatformIcon,
  verified,
  stat,
  value,
  info,
  verifiedAt,
  href,
}: {
  label: string;
  icon: Icon;
  verified: boolean;
  stat?: string | null;
  value?: string | null;
  info?: string[];
  verifiedAt?: Date | null;
  href?: string | null;
}) {
  const content = (
    <div
      className={cn(
        "bg-bg-subtle flex flex-col items-center gap-1 rounded-lg p-1 pt-2",
        href && "hover:bg-bg-muted transition-colors",
      )}
    >
      <div className="relative">
        <PlatformIcon
          className={cn("size-3.5", !value && "text-content-subtle opacity-40")}
        />
        {verified && (
          <BadgeCheck2
            variant="fill"
            className="absolute -right-1.5 -top-1.5 size-3 text-green-600"
          />
        )}
      </div>
      <span
        className={cn(
          "text-[9px] font-medium leading-none",
          verified && stat ? "text-content-default" : "text-content-subtle",
        )}
      >
        {verified && stat ? stat : "—"}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );

  const As = href ? "a" : "div";

  return (
    <DynamicTooltipWrapper
      tooltipProps={
        value
          ? {
              content: (
                <PlatformStatTooltipContent
                  icon={PlatformIcon}
                  value={value}
                  stat={stat}
                  info={info}
                  verifiedAt={verifiedAt}
                />
              ),
            }
          : undefined
      }
    >
      <As
        {...(href
          ? {
              href,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {})}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </As>
    </DynamicTooltipWrapper>
  );
}

function PlatformStatTooltipContent({
  icon: PlatformIcon,
  value,
  stat,
  info,
  verifiedAt,
}: {
  icon: Icon;
  value?: string | null;
  stat?: string | null;
  info?: string[];
  verifiedAt?: Date | null;
}) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-2 p-3 pb-1.5">
        <div className="border-border-subtle flex size-7 shrink-0 items-center justify-center rounded-full border">
          <PlatformIcon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-content-emphasis truncate font-semibold">
            {value}
          </div>
          {(info?.[0] ?? stat) && (
            <div className="text-content-default font-medium">
              {info?.[0] ?? stat}
            </div>
          )}
        </div>
      </div>
      <div className="text-content-subtle border-border-subtle flex items-center gap-1.5 border-t px-3 py-1.5 font-medium">
        {verifiedAt ? (
          <>
            <BadgeCheck2
              variant="fill"
              className="size-3 shrink-0 text-green-600"
            />
            Verified {timeAgo(verifiedAt, { withAgo: true })}
          </>
        ) : (
          "Not verified"
        )}
      </div>
    </div>
  );
}

function ListRow({
  items,
  className,
}: {
  items?: { icon?: Icon; label: string }[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);

  const [shownItems, setShownItems] = useState<
    { icon?: Icon; label: string }[] | undefined
  >(items);

  useEffect(() => {
    if (isReady) return;

    setIsReady(false);
    setShownItems(items);
  }, [items, isReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (
      shownItems?.length &&
      containerRef.current.scrollWidth > containerRef.current.clientWidth
    ) {
      setIsReady(false);
      setShownItems(shownItems?.slice(0, -1));
    } else {
      setIsReady(true);
    }
  }, [shownItems]);

  const entry = useResizeObserver(containerRef);
  useEffect(() => {
    if (!containerRef.current) return;

    if (containerRef.current.scrollWidth > containerRef.current.clientWidth)
      setIsReady(false);
  }, [entry]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden",
        items?.length && !isReady && "opacity-0",
      )}
    >
      <div className={cn("flex gap-1", className)}>
        {items ? (
          items.length ? (
            <>
              {shownItems?.map(({ icon, label }) => (
                <ListPill key={label} icon={icon} label={label} />
              ))}
              {(shownItems?.length ?? 0) < items.length && (
                <Tooltip
                  content={
                    <div className="flex max-w-sm flex-wrap gap-1 p-2">
                      {items
                        .filter(
                          ({ label }) =>
                            !shownItems?.some(
                              ({ label: shownLabel }) => shownLabel === label,
                            ),
                        )
                        .map(({ icon, label }) => (
                          <ListPill key={label} icon={icon} label={label} />
                        ))}
                    </div>
                  }
                >
                  <div className="text-content-default flex h-7 select-none items-center rounded-full bg-neutral-100 px-2 text-xs font-medium transition-colors hover:bg-neutral-200">
                    +{items.length - (shownItems?.length ?? 0)}
                  </div>
                </Tooltip>
              )}
            </>
          ) : (
            <div className="flex h-7 w-fit items-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-2">
              <span className="text-content-subtle text-xs opacity-60">
                No categories
              </span>
            </div>
          )
        ) : (
          [...Array(2)].map((_, idx) => (
            <div key={idx} className="h-7 w-20 rounded-full bg-neutral-100" />
          ))
        )}
      </div>
    </div>
  );
}

function ListPill({ icon: Icon, label }: { icon?: Icon; label: string }) {
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full bg-neutral-100 px-2">
      {Icon && <Icon className="text-content-emphasis size-3 shrink-0" />}
      <span className="text-content-default whitespace-nowrap text-xs font-medium">
        {label}
      </span>
    </div>
  );
}
