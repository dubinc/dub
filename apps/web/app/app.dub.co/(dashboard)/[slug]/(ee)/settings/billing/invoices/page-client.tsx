"use client";

import { INVOICE_PAYMENT_METHODS } from "@/lib/constants/payouts";
import useWorkspace from "@/lib/swr/use-workspace";
import { InvoiceProps } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  Button,
  buttonVariants,
  Receipt2,
  StatusBadge,
  TabSelect,
  useRouterStuff,
} from "@dub/ui";
import { cn, currencyFormatter, fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";

const INVOICE_TYPES = [
  { id: "subscription", label: "Subscription" },
  { id: "partnerPayout", label: "Partner payouts" },
  { id: "domainRenewal", label: "Domain renewals" },
];

export default function WorkspaceInvoicesClient() {
  const { slug } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();

  const selectedInvoiceType = useMemo(() => {
    let type = searchParams.get("type");

    if (type === "payout") {
      type = "partnerPayout";
    }

    return INVOICE_TYPES.find((t) => t.id === type) || INVOICE_TYPES[0];
  }, [searchParams]);

  const { data: invoices } = useSWR<InvoiceProps[]>(
    `/api/workspaces/${slug}/billing/invoices?type=${selectedInvoiceType.id}`,
    fetcher,
  );

  const displayPaymentMethod = selectedInvoiceType.id === "partnerPayout";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 md:pb-2 lg:flex-row">
        <div>
          <h2 className="text-xl font-medium">Invoices</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            A history of all your Dub invoices
          </p>
        </div>
      </div>
      <TabSelect
        className="px-4 md:px-5"
        options={INVOICE_TYPES}
        selected={selectedInvoiceType.id}
        onSelect={(id) => {
          queryParams({
            set: {
              type: id,
            },
          });
        }}
      />
      <div className="grid divide-y divide-neutral-200 border-t border-neutral-200">
        {invoices ? (
          invoices.length > 0 ? (
            invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                displayPaymentMethod={displayPaymentMethod}
              />
            ))
          ) : (
            <AnimatedEmptyState
              title={`No ${selectedInvoiceType.label.toLowerCase()} invoices found`}
              description={`You don't have any ${selectedInvoiceType.label.toLowerCase()} invoices yet`}
              cardContent={() => (
                <>
                  <Receipt2 className="size-4 text-neutral-700" />
                  <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                </>
              )}
              className="border-none"
            />
          )
        ) : (
          <>
            <InvoiceCardSkeleton displayPaymentMethod={displayPaymentMethod} />
            <InvoiceCardSkeleton displayPaymentMethod={displayPaymentMethod} />
            <InvoiceCardSkeleton displayPaymentMethod={displayPaymentMethod} />
          </>
        )}
      </div>
    </div>
  );
}

const InvoiceCard = ({
  invoice,
  displayPaymentMethod = false,
}: {
  invoice: InvoiceProps;
  displayPaymentMethod: boolean;
}) => {
  const invoicePaymentMethod =
    INVOICE_PAYMENT_METHODS[invoice.paymentMethod ?? "ach"];

  return (
    <div className="px-3 py-4 xl:px-12">
      {/* Mobile layout */}
      <div className="block xl:hidden">
        <div className="mb-4 flex items-start justify-between">
          <div className="text-sm">
            <div className="font-medium">{invoice.description}</div>
            <div className="text-neutral-500">
              {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="flex items-center">
            {invoice.pdfUrl ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-9 items-center justify-center rounded-md border px-3 text-sm",
                )}
              >
                <span>View invoice</span>
              </a>
            ) : (
              <Button
                className="h-9 px-3"
                variant="secondary"
                text="View invoice"
                disabled
                disabledTooltip={
                  invoice.failedReason ||
                  "Invoice not available. Contact support if you need assistance."
                }
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-left text-sm">
            <div className="font-medium">Total</div>
            <div className="flex items-center gap-1.5 text-neutral-500">
              <span className="text-sm font-medium">
                {currencyFormatter(invoice.total / 100)}
              </span>
              {invoice.status &&
                (() => {
                  const badge = PayoutStatusBadges[invoice.status];
                  return (
                    <StatusBadge
                      icon={null}
                      variant={badge.variant}
                      className="rounded-md py-0.5"
                    >
                      {badge.label}
                    </StatusBadge>
                  );
                })()}
            </div>
          </div>

          {displayPaymentMethod && (
            <div className="text-left text-sm">
              <div className="font-medium">Method</div>
              {invoicePaymentMethod ? (
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <div className="text-content-subtle text-sm font-medium">
                    {invoicePaymentMethod.label}
                  </div>
                  <StatusBadge
                    icon={null}
                    variant="neutral"
                    className="rounded-md py-0.5 text-xs font-semibold text-neutral-700"
                  >
                    {invoicePaymentMethod.duration}
                  </StatusBadge>
                </div>
              ) : (
                <span className="text-neutral-500">-</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden xl:grid xl:grid-cols-4 xl:gap-4">
        <div className="text-sm xl:col-span-1">
          <div className="font-medium">{invoice.description}</div>
          <div className="text-neutral-500">
            {new Date(invoice.createdAt).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
              day: "numeric",
            })}
          </div>
        </div>

        <div className="text-left text-sm sm:col-span-1">
          <div className="font-medium">Total</div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="text-sm font-medium">
              {currencyFormatter(invoice.total / 100)}
            </span>
            {invoice.status &&
              (() => {
                const badge = PayoutStatusBadges[invoice.status];
                return (
                  <StatusBadge
                    icon={null}
                    variant={badge.variant}
                    className="rounded-md py-0.5"
                  >
                    {badge.label}
                  </StatusBadge>
                );
              })()}
          </div>
        </div>

        {displayPaymentMethod && (
          <div className="text-left text-sm sm:col-span-1 lg:block">
            <div className="font-medium">Method</div>
            {invoicePaymentMethod ? (
              <div className="flex items-center gap-1.5 text-neutral-500">
                <div className="text-content-subtle text-sm font-medium">
                  {invoicePaymentMethod.label}
                </div>
                <StatusBadge
                  icon={null}
                  variant="neutral"
                  className="rounded-md py-0.5 text-xs font-semibold text-neutral-700"
                >
                  {invoicePaymentMethod.duration}
                </StatusBadge>
              </div>
            ) : (
              <span className="text-neutral-500">-</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end sm:col-span-1 sm:justify-end">
          {invoice.pdfUrl ? (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-9 items-center justify-center rounded-md border px-3 text-sm",
              )}
            >
              <span>View invoice</span>
            </a>
          ) : (
            <Button
              className="h-9 px-3"
              variant="secondary"
              text="View invoice"
              disabled
              disabledTooltip={
                invoice.failedReason ||
                "Invoice not available. Contact support if you need assistance."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

const InvoiceCardSkeleton = ({
  displayPaymentMethod = false,
}: {
  displayPaymentMethod?: boolean;
}) => {
  return (
    <div className="px-4 py-6 sm:px-12">
      {/* Mobile skeleton */}
      <div className="block sm:hidden">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-col gap-1 text-sm">
            <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
          </div>

          {displayPaymentMethod && (
            <div className="flex flex-col gap-1">
              <div className="h-4 w-12 animate-pulse rounded-md bg-neutral-200" />
              <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
            </div>
          )}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-1 text-sm sm:col-span-1">
          <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-1">
          <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
        </div>

        {displayPaymentMethod && (
          <div className="flex flex-col gap-1 sm:col-span-1">
            <div className="h-4 w-12 animate-pulse rounded-md bg-neutral-200" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
          </div>
        )}

        <div className="flex items-center justify-end sm:col-span-1 sm:justify-end">
          <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
};
