"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { EventDatum } from "@/ui/analytics/events/events-table";
import {
  CalendarIcon,
  ChartActivity2,
  CopyButton,
  OfficeBuilding,
  Tooltip,
} from "@dub/ui";
import {
  COUNTRIES,
  OG_AVATAR_URL,
  fetcher,
  formatDate,
  timeAgo,
} from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PartnerInfo({ partner }: { partner?: EnrolledPartnerProps }) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { partnerId } = useParams() as { partnerId: string };

  const { data: eventsData, isLoading: isLoadingEvents } = useSWR<EventDatum[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/events?${new URLSearchParams({ workspaceId, programId: defaultProgramId, partnerId, interval: "all", limit: "1" })}`,
    fetcher,
  );

  const basicFields = [
    {
      id: "event",
      icon: <ChartActivity2 className="size-3.5" />,
      text: eventsData
        ? eventsData.length
          ? `Last event ${timeAgo(new Date(eventsData[0].timestamp), { withAgo: true })}`
          : null
        : undefined,
    },
    {
      id: "companyName",
      icon: <OfficeBuilding className="size-3.5" />,
      text: partner ? partner.companyName || null : undefined,
    },
    {
      id: "createdAt",
      icon: <CalendarIcon className="size-3.5" />,
      text: partner
        ? `Partner since ${formatDate(partner.createdAt)}`
        : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-subtle rounded-xl border p-4">
        <div className="flex flex-col">
          <div className="relative w-fit">
            {partner ? (
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-20 rounded-full"
              />
            ) : (
              <div className="size-20 animate-pulse rounded-full bg-neutral-200" />
            )}
            {partner?.country && (
              <Tooltip content={COUNTRIES[partner.country]}>
                <div className="absolute right-0 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${partner.country}.svg`}
                    className="size-4 rounded-full"
                  />
                </div>
              </Tooltip>
            )}
          </div>
          <div className="mt-4">
            {partner ? (
              <span className="text-lg font-semibold text-neutral-900">
                {partner.name}
              </span>
            ) : (
              <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
            )}
          </div>
          {partner ? (
            partner.email && (
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-sm font-medium text-neutral-500">
                  {partner.email}
                </span>
                <CopyButton
                  value={partner.email}
                  variant="neutral"
                  className="p-1 [&>*]:h-3 [&>*]:w-3"
                  successMessage="Copied email to clipboard!"
                />
              </div>
            )
          ) : (
            <div className="mt-0.5 h-5 w-32 animate-pulse rounded bg-neutral-200" />
          )}

          <div className="mt-3 flex flex-col gap-2">
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
        </div>
      </div>
    </div>
  );
}
