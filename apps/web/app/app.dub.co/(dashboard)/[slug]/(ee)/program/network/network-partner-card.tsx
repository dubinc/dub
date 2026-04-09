"use client";

import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PartnerStarButton } from "@/ui/partners/partner-star-button";
import { TrustedPartnerBadge } from "@/ui/partners/trusted-partner-badge";
import {
  BadgeCheck2Fill,
  Tooltip,
  UserPlus,
  useResizeObserver,
  useRouterStuff,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { EnvelopeArrowRight, Globe } from "@dub/ui/icons";
import {
  COUNTRIES,
  cn,
  formatDate,
  isClickOnInteractiveChild,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
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
        icon: <UserPlus className="size-3.5 shrink-0" />,
        text: partner
          ? `Joined ${formatDate(partner.createdAt, { month: "short" })}`
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
          })).filter((field) => field.value && field.href)
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
          queryParams({ set: { partnerId: partner.id }, scroll: false });
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
      <div className="border-border-subtle rounded-xl border bg-white p-4">
        <div className="flex justify-between gap-4">
          {/* Avatar + country icon */}
          <div className="relative w-fit">
            {partner ? (
              <PartnerAvatar
                partner={partner}
                className="size-16 border border-neutral-100"
              />
            ) : (
              <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
            )}
            {partner?.trustedAt && <TrustedPartnerBadge />}
          </div>

          {partner && onToggleStarred && (
            <PartnerStarButton
              partner={partner}
              onToggleStarred={onToggleStarred}
              className="size-6"
              iconSize="size-3"
            />
          )}
        </div>

        <div className="mt-3.5 flex flex-col gap-3">
          {/* Name */}
          {partner ? (
            <span className="text-content-emphasis text-base font-semibold">
              {partner.name}
            </span>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
          )}

          {/* Basic details */}
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

          {/* Platforms */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              !partner && "animate-pulse",
            )}
          >
            {partnerPlatformsData?.length
              ? partnerPlatformsData.map(
                  ({ label, icon: Icon, verified, value, href }) => (
                    <Tooltip
                      key={label}
                      content={
                        <Link
                          href={href ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-content-default hover:text-content-emphasis flex items-center gap-1 px-2 py-1 text-xs font-medium"
                        >
                          <Icon className="size-3 shrink-0" />
                          <span>{value}</span>
                          {verified && (
                            <BadgeCheck2Fill className="size-3 text-green-600" />
                          )}
                        </Link>
                      }
                    >
                      <Link
                        key={label}
                        href={href ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-border-subtle hover:bg-bg-muted relative flex size-6 shrink-0 items-center justify-center rounded-full border"
                      >
                        <Icon className="size-3" />
                        <span className="sr-only">{label}</span>

                        {verified && (
                          <BadgeCheck2Fill className="absolute -right-1 -top-1 size-3 text-green-600" />
                        )}
                      </Link>
                    </Tooltip>
                  ),
                )
              : [...Array(3)].map((_, idx) => (
                  <div
                    key={idx}
                    className="size-6 rounded-full bg-neutral-100"
                  />
                ))}
          </div>

          {/* Categories */}
          <ListRow items={categoriesData} />
        </div>
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

    // Determine if we need to show less items
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

  // Show less items if needed after resizing
  const entry = useResizeObserver(containerRef);
  useEffect(() => {
    if (!containerRef.current) return;

    if (containerRef.current.scrollWidth > containerRef.current.clientWidth)
      setIsReady(false);
  }, [entry]);

  if (items && items.length === 0) return null;
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
                  <div className="text-content-default flex h-7 select-none items-center rounded-full bg-neutral-100 px-2 text-xs font-medium hover:bg-neutral-200">
                    +{items.length - (shownItems?.length ?? 0)}
                  </div>
                </Tooltip>
              )}
            </>
          ) : (
            <div className="flex h-7 w-fit items-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-2">
              <span className="text-content-subtle text-xs opacity-60">
                Not specified
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
