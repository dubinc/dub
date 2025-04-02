import useWorkspace from "@/lib/swr/use-workspace";
import {
  Customer,
  CustomerActivity,
  CustomerActivityResponse,
} from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  CopyButton,
  Sheet,
  TabSelect,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import {
  ArrowRight,
  CursorRays,
  Link4,
  MoneyBill2,
  UserCheck,
} from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
} from "@dub/utils";
import { formatDistanceStrict } from "date-fns";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import useSWR from "swr";

interface CustomerDetailsSheetProps {
  customer: Customer;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function CustomerDetailsSheetContent({ customer }: CustomerDetailsSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();

  let { data: customerActivity, isLoading } = useSWR<CustomerActivityResponse>(
    `/api/customers/${customer.id}/activity?workspaceId=${workspaceId}`,
    fetcher,
  );

  const link = customerActivity?.link;
  const events = customerActivity?.activity;
  const country = customer.country;

  return (
    <>
      <div className="flex grow flex-col">
        <div className="flex items-start justify-between p-6">
          <Sheet.Title className="text-xl font-semibold">
            Customer details
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="border-y border-neutral-200 bg-neutral-50 p-6 pb-0">
          <div className="flex h-12 w-full justify-between">
            <div>
              <img
                src={
                  customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`
                }
                alt={customer.name}
                className="size-12 rounded-full"
              />
            </div>

            <div className="flex min-w-[40%] shrink grow basis-1/2 flex-col items-end justify-end gap-2">
              {link ? (
                <Link
                  href={`/${slug}/events?domain=${link.domain}&key=${link.key}&interval=all`}
                  target="_blank"
                  className="flex min-w-0 items-center gap-1 overflow-hidden rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <Link4 className="size-3.5" />
                  <span className="truncate">
                    {getPrettyUrl(link.shortLink)}
                  </span>
                </Link>
              ) : (
                <div className="h-4 w-24 animate-pulse rounded-full bg-neutral-200" />
              )}

              {country && (
                <Link
                  href={`/${slug}/events?country=${country}`}
                  target="_blank"
                  className="flex min-w-20 items-center gap-2 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${country}.svg`}
                    className="h-3 w-4 rounded-sm"
                  />
                  <span className="truncate">{COUNTRIES[country]}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold leading-tight text-neutral-900">
                {customer.name}
              </span>
              <span className="rounded-full border border-neutral-200 bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-900">
                {new Date(customer.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {customer.email && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-neutral-500">
                  {customer.email}
                </span>
                <CopyButton
                  value={customer.email}
                  variant="neutral"
                  className="p-1 [&>*]:h-3 [&>*]:w-3"
                  successMessage="Copied email to clipboard!"
                />
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                {
                  label: "Lead",
                  value: customerActivity?.timeToLead // in milliseconds
                    ? formatDistanceStrict(0, customerActivity.timeToLead)
                    : "-",
                  description:
                    "The time it took for this customer to convert from last click to a signup.",
                },
                {
                  label: "Sale",
                  value: customerActivity?.timeToSale
                    ? formatDistanceStrict(0, customerActivity.timeToSale)
                    : "-",
                  description:
                    "The time it took for this customer to convert from signup to a purchase.",
                  className: "pl-6",
                },
              ].map(({ label, value, description, className }, index) => (
                <div
                  key={label}
                  className={cn(
                    "relative flex flex-col bg-neutral-50 p-3",
                    className,
                  )}
                >
                  <Tooltip content={description}>
                    <span className="cursor-default truncate text-xs text-neutral-400 underline decoration-dotted underline-offset-2">
                      {label}
                    </span>
                  </Tooltip>
                  <span className="text-base text-neutral-900">{value}</span>
                  {index === 0 && (
                    <div className="absolute inset-0 right-0 z-10 m-auto -mr-2.5 flex size-5 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-900">
                      <ArrowRight className="size-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                {
                  label: "Lifetime value",
                  value:
                    customerActivity?.ltv !== undefined
                      ? currencyFormatter(customerActivity.ltv / 100, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "-",
                  description:
                    "The total amount of money this customer has spent on your products.",
                },
              ].map(({ label, value, description }) => (
                <div key={label} className="flex flex-col bg-neutral-50 p-3">
                  <Tooltip content={description} align="end">
                    <span className="cursor-default truncate text-xs text-neutral-400 underline decoration-dotted underline-offset-2">
                      {label}
                    </span>
                  </Tooltip>
                  <span className="text-base text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <TabSelect
            className="mt-2"
            options={[{ id: "activity", label: "Activity" }]}
            selected={"activity"}
          />
        </div>

        <div className="flex grow flex-col p-6">
          {isLoading && !events ? (
            <div className="flex flex-col gap-5">
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {(events || []).map((activity, index) => (
                <Activity
                  activity={activity}
                  key={index}
                  isLast={index === (events || []).length - 1}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

const activityIcons = {
  click: CursorRays,
  lead: UserCheck,
  sale: MoneyBill2,
};

function Activity({
  activity,
  isLast,
}: {
  activity: CustomerActivity;
  isLast: boolean;
}) {
  const timestamp = new Date(activity.timestamp);

  const month = timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const time = timestamp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  const Icon = activityIcons[activity.event as keyof typeof activityIcons];

  return (
    <li className="flex items-center">
      <div className="relative mr-3 flex-shrink-0">
        <Icon className="size-4" />
        {!isLast && (
          <div className="absolute left-1/2 mt-1 h-4 border-l border-neutral-300" />
        )}
      </div>
      <span className="flex-grow text-sm text-neutral-700">
        {activity.eventName}

        {activity.eventDetails && (
          <span className="ml-1 font-medium text-neutral-700">
            ({activity.eventDetails})
          </span>
        )}
      </span>
      <div className="text-sm text-neutral-500">
        {month}, {time}
      </div>
    </li>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center">
      <div className="relative mr-3 flex-shrink-0">
        <div className="size-4 animate-pulse rounded-md bg-neutral-200" />
        <div className="absolute left-1/2 mt-1 h-4 border-l border-neutral-300" />
      </div>
      <div className="flex-grow">
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="ml-2 h-4 w-16 animate-pulse rounded bg-neutral-200" />
    </div>
  );
}

export function CustomerDetailsSheet({
  isOpen,
  ...rest
}: CustomerDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "customerId", scroll: false })}
    >
      <CustomerDetailsSheetContent {...rest} />
    </Sheet>
  );
}
