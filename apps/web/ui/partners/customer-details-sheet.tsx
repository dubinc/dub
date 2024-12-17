import useWorkspace from "@/lib/swr/use-workspace";
import {
  Customer,
  CustomerActivity,
  CustomerActivityResponse,
} from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
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
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
  timeAgo,
} from "@dub/utils";
import { UserCheck } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import useSWR from "swr";
import { AnimatedEmptyState } from "../shared/animated-empty-state";

// Fake link for now
const link = {
  domain: "dub.co",
  key: "123456",
  shortLink: "https://dub.co/123456",
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
      `/api/customers/${customer.id}/activities?workspaceId=${workspaceId}`,
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
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col">
              <img
                src={
                  customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`
                }
                alt={customer.name}
                className="size-12 rounded-full"
              />
              <div className="mt-4 flex flex-col gap-1.5">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {customer.name}
                </span>
                <span className="text-sm text-neutral-500">
                  {customer.email}
                </span>
              </div>
            </div>

            <div className="flex min-w-[40%] shrink grow basis-1/2 flex-col items-end justify-end gap-2">
              {link && (
                <div className="group flex min-w-0 items-center gap-1 overflow-hidden rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700">
                  <Link4 className="size-3.5" />
                  <span className="truncate">
                    {getPrettyUrl(link.shortLink)}
                  </span>
                  <span className="sr-only">Filter</span>
                  <FilterBars className="h-3.5 w-3.5" />
                </div>
              )}
              {customer.country && (
                <div className="flex min-w-20 items-center gap-2 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${customer.country}.svg`}
                    className="h-3 w-4 rounded-sm"
                  />
                  <span className="truncate">
                    {COUNTRIES[customer.country]}
                  </span>
                </div>
              )}
            </div>
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
                },
              ].map(({ label, value, description }) => (
                <div key={label} className="flex flex-col bg-neutral-50 p-3">
                  <Tooltip content={description}>
                    <span className="cursor-default truncate text-xs text-neutral-400 underline decoration-dotted underline-offset-2">
                      {label}
                    </span>
                  </Tooltip>
                  <span className="text-base text-neutral-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                {
                  label: "Lifetime value",
                  value: customerActivity?.ltv
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