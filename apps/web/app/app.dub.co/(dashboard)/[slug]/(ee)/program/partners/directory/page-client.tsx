"use client";

import { ONLINE_PRESENCE_FIELDS } from "@/lib/partners/online-presence";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscoverablePartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { BadgeCheck2Fill, ChartActivity2, Tooltip, UserPlus } from "@dub/ui";
import { COUNTRIES, OG_AVATAR_URL, fetcher, formatDate } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";

export function ProgramPartnersDirectoryPageClient() {
  const { id: workspaceId } = useWorkspace();

  const { data: partners, error } = useSWR<DiscoverablePartnerProps[]>(
    workspaceId &&
      `/api/network/partners?${new URLSearchParams({
        workspaceId,
        page: "1",
      })}`,
    fetcher,
  );

  return (
    <div>
      {error ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load partners
        </div>
      ) : !partners || partners?.length ? (
        <div className="@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 lg:gap-6">
          {partners
            ? partners?.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))
            : [...Array(8)].map((_, idx) => <PartnerCard key={idx} />)}
        </div>
      ) : (
        <div className="text-content-subtle py-12 text-sm">
          No partners found
        </div>
      )}
    </div>
  );
}

function PartnerCard({ partner }: { partner?: DiscoverablePartnerProps }) {
  const basicFields = useMemo(
    () => [
      {
        id: "listedAt",
        icon: <UserPlus className="size-3.5" />,
        text: partner
          ? partner.discoverableAt
            ? `Listed ${formatDate(partner.discoverableAt)}`
            : null
          : undefined,
      },
      {
        id: "lastConversion",
        icon: <ChartActivity2 className="size-3.5" />,
        text: partner ? `Last conversion XXX ago` : undefined,
      },
      {
        id: "conversion",
        icon: <X className="size-3.5" />,
        text: partner ? `XXXX conversion` : undefined,
      },
    ],
    [partner],
  );

  const onlinePresenceData = useMemo(
    () =>
      partner
        ? ONLINE_PRESENCE_FIELDS.map((field) => ({
            label: field.label,
            icon: field.icon,
            ...field.data(partner),
          })).filter((field) => field.value && field.href)
        : null,
    [partner],
  );

  return (
    <div className="border-border-subtle rounded-xl border p-4">
      <div className="flex justify-between gap-4">
        {/* Avatar + country icon */}
        <div className="relative w-fit">
          {partner ? (
            <img
              src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
              alt={partner.name}
              className="size-16 rounded-full"
            />
          ) : (
            <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
          )}
          {partner?.country && (
            <Tooltip content={COUNTRIES[partner.country]}>
              <div className="absolute -right-1 top-1 overflow-hidden rounded-full bg-white p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                <img
                  alt=""
                  src={`https://flag.vercel.app/m/${partner.country}.svg`}
                  className="size-3.5 rounded-full"
                />
              </div>
            </Tooltip>
          )}
        </div>
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
        <div className="flex flex-col gap-1">
          {basicFields
            .filter(({ text }) => text !== null)
            .map(({ id, icon, text }) => (
              <div
                key={id}
                className="text-content-subtle flex items-center gap-1"
              >
                {text !== undefined ? (
                  <>
                    {icon}
                    <span className="text-xs font-medium">{text}</span>
                  </>
                ) : (
                  <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                )}
              </div>
            ))}
        </div>

        {/* Online presence */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onlinePresenceData
            ? onlinePresenceData.map(
                ({ label, icon: Icon, verified, value, href }) => (
                  <Tooltip
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
            : [...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="size-6 animate-pulse rounded-full bg-neutral-200"
                />
              ))}
        </div>
      </div>
    </div>
  );
}
