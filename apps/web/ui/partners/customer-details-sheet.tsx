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
  InvoiceDollar,
  LinesY,
  Sheet,
  useRouterStuff,
} from "@dub/ui";
import {
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
} from "@dub/utils";
import { UserCheck } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import useSWR from "swr";

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

  const { data: customerActivity, isLoading } =
    useSWR<CustomerActivityResponse>(
      `/api/customers/${customer.id}/activities?workspaceId=${workspaceId}`,
      fetcher,
    );

  console.log("activities", customerActivity);

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
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
        <div className="p-6">
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

            <div className="flex flex-col gap-2">
              <div className="flex min-w-[40%] shrink grow basis-1/2 flex-wrap items-center justify-end gap-2">
                {link && (
                  <a
                    href={`/${slug}/analytics?domain=${link.domain}&key=${link.key}`}
                    target="_blank"
                    className="group flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 transition-colors duration-100 hover:bg-neutral-200/70 active:bg-neutral-200"
                  >
                    <LinesY className="size-3.5" />
                    <span className="truncate">
                      {getPrettyUrl(link.shortLink)}
                    </span>
                  </a>
                )}
              </div>
              <div>
                {customer.country && (
                  <div className="flex min-w-20 items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                    <img
                      alt=""
                      src={`https://flag.vercel.app/m/${customer.country}.svg`}
                      className="h-3 w-4"
                    />
                    <span className="truncate">
                      {COUNTRIES[customer.country]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {/* <div className="absolute ml-2 flex h-full flex-grow flex-col border-l border-neutral-200" /> */}
            <div className="flex flex-col gap-4">
              {customerActivity?.activities.map((activity, index) => (
                <Activity activity={activity} key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
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

const activityIcons = {
  click: CursorRays,
  lead: UserCheck,
  sale: InvoiceDollar,
};

function Activity({ activity }: { activity: CustomerActivity }) {
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
    <div className="flex items-center">
      <div className="mr-3 flex-shrink-0">
        <Icon className="size-4" />
      </div>
      <span className="flex-grow text-neutral-700">
        <span className="font-medium">
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
    </div>
  );
}
