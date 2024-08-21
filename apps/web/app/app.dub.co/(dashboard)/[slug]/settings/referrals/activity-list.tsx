"use client";

import { clickEventEnrichedSchema } from "@/lib/zod/schemas/clicks";
import { leadEventEnrichedSchema } from "@/lib/zod/schemas/leads";
import { saleEventEnrichedSchema } from "@/lib/zod/schemas/sales";
import { EventList } from "@/ui/blocks/event-list";
import { useRouterStuff } from "@dub/ui";
import { CursorRays, Globe, InvoiceDollar, UserCheck } from "@dub/ui/src/icons";
import { COUNTRIES, timeAgo } from "@dub/utils";
import { z } from "zod";

type ActivityListProps = {
  page: number;
  hasNextPage?: boolean;
} & (
  | {
      event: "clicks";
      events: z.infer<typeof clickEventEnrichedSchema>[];
    }
  | {
      event: "leads";
      events: z.infer<typeof leadEventEnrichedSchema>[];
    }
  | {
      event: "sales";
      events: z.infer<typeof saleEventEnrichedSchema>[];
    }
);

export function ActivityList({
  event,
  page,
  hasNextPage,
  events,
}: ActivityListProps) {
  const { queryParams } = useRouterStuff();

  return (
    <EventList
      events={events.map((e) => {
        const Icon = {
          clicks: CursorRays,
          leads: UserCheck,
          sales: InvoiceDollar,
        }[event];
        return {
          icon: <Icon className="size-4.5" />,
          content: {
            clicks: <ClickDescription event={e} />,
            leads: <LeadDescription event={e} />,
            sales: <SaleDescription event={e} />,
          }[event],
          right: (
            <div className="whitespace-nowrap">
              {timeAgo(new Date(e.timestamp), { withAgo: true })}
            </div>
          ),
        };
      })}
      onPrevious={() =>
        queryParams({ set: { page: Math.max(page - 1, 1).toString() } })
      }
      onNext={() => queryParams({ set: { page: (page + 1).toString() } })}
      hasPrevious={page > 1}
      hasNext={hasNextPage}
    />
  );
}

function ClickDescription({
  event,
}: {
  event: z.infer<typeof clickEventEnrichedSchema>;
}) {
  return (
    <>
      Someone from{" "}
      <div className="mx-1 inline-block">
        {event.country ? (
          <img
            alt={event.country}
            src={`https://flag.vercel.app/m/${event.country}.svg`}
            className="-mt-px inline-block h-3 w-4"
          />
        ) : (
          <Globe className="inline-block size-3 text-gray-700" />
        )}{" "}
        <span className="font-semibold text-gray-700">
          {event.country ? COUNTRIES[event.country] : "Planet Earth"}
        </span>{" "}
      </div>
      clicked on your link
    </>
  );
}

function LeadDescription({
  event,
}: {
  event: z.infer<typeof leadEventEnrichedSchema>;
}) {
  return (
    <>
      Someone from{" "}
      <div className="mx-1 inline-block">
        {event.country ? (
          <img
            alt={event.country}
            src={`https://flag.vercel.app/m/${event.country}.svg`}
            className="-mt-px inline-block h-3 w-4"
          />
        ) : (
          <Globe className="inline-block size-3 text-gray-700" />
        )}{" "}
        <span className="font-semibold text-gray-700">
          {event.country ? COUNTRIES[event.country] : "Planet Earth"}
        </span>{" "}
      </div>
      signed up for an account
    </>
  );
}

function SaleDescription({
  event,
}: {
  event: z.infer<typeof saleEventEnrichedSchema>;
}) {
  return (
    <>
      Someone from{" "}
      <div className="mx-1 inline-block">
        {event.country ? (
          <img
            alt={event.country}
            src={`https://flag.vercel.app/m/${event.country}.svg`}
            className="-mt-px inline-block h-3 w-4"
          />
        ) : (
          <Globe className="inline-block size-3 text-gray-700" />
        )}{" "}
        <span className="font-semibold text-gray-700">
          {event.country ? COUNTRIES[event.country] : "Planet Earth"}
        </span>{" "}
      </div>
      upgraded their account
    </>
  );
}
