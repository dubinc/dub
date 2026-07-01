"use client";

import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { TrustedPartnerBadge } from "@/ui/partners/trusted-partner-badge";
import { UserPlus, useRouterStuff } from "@dub/ui";
import { ChartActivity2, EnvelopeArrowRight, Globe } from "@dub/ui/icons";
import {
  COUNTRIES,
  cn,
  isClickOnInteractiveChild,
  timeAgo,
} from "@dub/utils";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import {
  NetworkPartnerAudienceSection,
  getPlatformSortOrder,
} from "./network-partner-audience-section";
import { NetworkPartnerCardActions } from "./network-partner-card-actions";
import { ListRow } from "./overflow-pill-list";

export function NetworkPartnerCard({
  bottomContent,
  partner,
  onToggleStarred,
}: {
  bottomContent?: ReactNode;
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
          queryParams({
            set: { partnerId: partner.id },
          });
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
        {bottomContent ?? (
          <NetworkPartnerAudienceSection
            partner={partner}
            partnerPlatformsData={partnerPlatformsData}
          />
        )}
      </div>
    </div>
  );
}
