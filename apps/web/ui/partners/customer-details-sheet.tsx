import useWorkspace from "@/lib/swr/use-workspace";
import {
  Customer,
  CustomerActivity,
  CustomerActivityResponse,
} from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  ArrowRight,
  Button,
  CursorRays,
  FilterBars,
  GreekTemple,
  InvoiceDollar,
  Link4,
  Sheet,
  TabSelect,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
  timeAgo,
} from "@dub/utils";
import { UserCheck } from "lucide-react";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import useSWR from "swr";
import { AnimatedEmptyState } from "../shared/animated-empty-state";

// Fake link for now
const link = {
  domain: "dub.sh",
  key: "with-webhook",
  shortLink: "https://dub.co/kiran",
};

interface CustomerDetailsSheetProps {
  customer: Customer;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function CustomerDetailsSheetContent({
  customer,
  setIsOpen,
}: CustomerDetailsSheetProps) {
  const { id: workspaceId, slug } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const { data: customerActivity, isLoading } =
    useSWR<CustomerActivityResponse>(
      `/api/customers/${customer.id}/activity?workspaceId=${workspaceId}`,
      fetcher,
    );

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
          <div className="flex w-full justify-between">
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
              {link && (
                <Link
                  href={`/events?domain=${link.domain}&key=${link.key}`}
                  target="_blank"
                  className="group flex min-w-0 items-center gap-1 overflow-hidden rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <Link4 className="size-3.5" />
                  <span className="truncate">
                    {getPrettyUrl(link.shortLink)}
                  </span>
                  <FilterBars className="hidden size-3 transition-transform group-hover:block" />
                </Link>
              )}

              {customer.country && (
                <Link
                  href={`/events?country=${customer.country}`}
                  target="_blank"
                  className="group flex min-w-20 items-center gap-2 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${customer.country}.svg`}
                    className="h-3 w-4 rounded-sm"
                  />
                  <span className="truncate">
                    {COUNTRIES[customer.country]}
                  </span>
                  <FilterBars className="hidden size-3 transition-transform group-hover:block" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold leading-tight text-neutral-900">
                {customer.name}
              </span>
              <span className="rounded-full border border-neutral-200 bg-gray-200 px-1 text-xs text-neutral-900">
                {new Date(customer.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <span className="text-sm text-neutral-500">{customer.email}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="xs:grid-cols-2 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                {
                  label: "Lead",
                  value: customerActivity?.timeToLead
                    ? timeAgo(
                        new Date(Date.now() - customerActivity.timeToLead),
                      )
                    : "-",
                  description:
                    "The time it took for this customer to convert into a lead.",
                },
                {
                  label: "Sale",
                  value: customerActivity?.timeToSale
                    ? timeAgo(
                        new Date(Date.now() - customerActivity.timeToSale),
                      )
                    : "-",
                  description:
                    "The time it took for this customer to convert from a lead to a purchase.",
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
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col bg-neutral-50 p-3">
                  <span className="truncate text-xs text-neutral-400">
                    {label}
                  </span>
                  <span className="text-base text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <TabSelect
            className="mt-6"
            options={[{ id: "activity", label: "Activity" }]}
            selected={"activity"}
          />
        </div>

        <div className="flex grow flex-col p-6">
          {isLoading || !customerActivity ? (
            <AnimatedEmptyState
              className="md:min-h-80"
              title="No activities"
              description="This customer has no activities yet."
              cardContent={() => (
                <>
                  <div className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                    <GreekTemple className="size-4 text-neutral-700" />
                  </div>
                  <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
                </>
              )}
            />
          ) : (
            <ul className="flex flex-col gap-6">
              {customerActivity?.activities.map((activity, index) => (
                <Activity
                  activity={activity}
                  key={index}
                  isLast={index === customerActivity?.activities.length - 1}
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
  sale: InvoiceDollar,
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
      <div className="mr-3 flex-shrink-0">
        <Icon className="size-4" />
      </div>
      <span className="flex-grow text-sm text-neutral-700">
        <span className="font-medium text-neutral-700">
          {activity.metadata?.amount
            ? `${currencyFormatter(activity.metadata.amount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} `
            : null}
        </span>

        {activity.event_name}
      </span>
      <div className="text-sm text-neutral-500">
        {month} at {time}
      </div>
    </li>
  );
}

function CustomerDetailsSheet({
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
export function useCustomerDetailsSheet({
  customer,
}: Omit<CustomerDetailsSheetProps, "setIsOpen">) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    customerDetailsSheet: (
      <CustomerDetailsSheet
        customer={customer}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      />
    ),
    setIsOpen,
  };
}
