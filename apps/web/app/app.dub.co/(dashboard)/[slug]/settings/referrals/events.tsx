"use client";

import { EventType } from "@/lib/analytics/types";
import { REFERRAL_REVENUE_SHARE } from "@/lib/referrals/constants";
import { EventList, EventListSkeleton, useEvents } from "@dub/blocks";
import {
  CaretUpFill,
  ChartActivity2,
  CursorRays,
  Globe,
  InvoiceDollar,
  UserCheck,
} from "@dub/ui/src/icons";
import { capitalize, COUNTRIES, currencyFormatter, timeAgo } from "@dub/utils";
import {
  ClickEvent,
  LeadEvent,
  SaleEvent,
} from "dub/dist/commonjs/models/components";

interface EventsProps {
  event: EventType;
  page: string;
}

const iconMap: Record<EventType, React.ElementType> = {
  clicks: CursorRays,
  leads: UserCheck,
  sales: InvoiceDollar,
};

const saleText = {
  "Subscription creation": "upgraded their account",
  "Subscription paid": "paid their subscription",
  "Plan upgraded": "upgraded their plan",
  default: "made a payment",
};

export const Events = ({ event, page }: EventsProps) => {
  const { events, isLoading } = useEvents({
    event,
    interval: "all",
    page,
  });

  if (isLoading || !events) {
    return <EventListSkeleton />;
  }

  const Icon = iconMap[event];

  return (
    <div className="relative">
      <EventList
        events={events.map((e: any) => {
          const content = {
            clicks: <ClickDescription event={e as ClickEvent} />,
            leads: <LeadDescription event={e as LeadEvent} />,
            sales: <SaleDescription event={e as SaleEvent} />,
          }[event];

          return {
            icon: <Icon className="size-4.5" />,
            content,
            right: e.timestamp ? (
              <div className="whitespace-nowrap">
                {timeAgo(new Date(e.timestamp), { withAgo: true })}
              </div>
            ) : null,
          };
        })}
        totalEvents={events?.length || 0}
        emptyState={{
          icon: ChartActivity2,
          title: `${capitalize(event)} Activity`,
          description: `No referral ${event} have been recorded yet.`,
          learnMore: "https://d.to/conversions",
        }}
      />

      {/* {demo && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff3] to-white"></div>
      )} */}
    </div>
  );
};

const ClickDescription = ({ event }: { event: ClickEvent }) => {
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
};

const LeadDescription = ({ event }: { event: LeadEvent }) => {
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
};

const SaleDescription = ({ event }: { event: SaleEvent }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
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
        {saleText[event.eventName] || saleText.default}
      </div>
      {event.saleAmount && event.saleAmount > 0 && (
        <span className="flex items-center gap-1 whitespace-nowrap font-medium text-gray-700 sm:pr-8 md:pr-12 lg:pr-20">
          {event.eventName === "Plan upgraded" && (
            <CaretUpFill className="size-3 text-green-600" />
          )}
          {currencyFormatter(
            Math.floor(event.saleAmount * REFERRAL_REVENUE_SHARE) / 100,
            {
              maximumFractionDigits: 2,
            },
          )}{" "}
          earned
        </span>
      )}
    </div>
  );
};
