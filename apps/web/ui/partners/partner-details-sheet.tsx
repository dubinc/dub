import { approvePartnerAction } from "@/lib/actions/approve-partner";
import { rejectPartner } from "@/lib/actions/reject-partner";
import usePayouts from "@/lib/swr/use-payouts";
import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PAYOUTS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  Sheet,
  StatusBadge,
  Table,
  ToggleGroup,
  useCopyToClipboard,
  useRouterStuff,
  useTable,
  useTablePagination,
} from "@dub/ui";
import { Copy, GreekTemple } from "@dub/ui/src/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  formatDate,
  getPrettyUrl,
} from "@dub/utils";
import { ChevronLeft, Link2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { PartnerLinkSelector } from "./partner-link-selector";
import { PartnerStatusBadges } from "./partner-status-badges";
import { PayoutStatusBadges } from "./payout-status-badges";

type PartnerDetailsSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerDetailsSheetContent({
  partner,
  setIsOpen,
}: PartnerDetailsSheetProps) {
  const badge = PartnerStatusBadges[partner.status];

  const saleAmount = (partner.link?.saleAmount ?? 0) / 100;
  const earnings = (partner.earnings ?? 0) / 100;

  const [, copyToClipboard] = useCopyToClipboard();

  const [selectedTab, setSelectedTab] = useState<"overview" | "payouts">(
    "overview",
  );

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Partner details
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
          {/* Basic info */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col">
              <img
                src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-12 rounded-full"
              />
              <div className="mt-4 flex items-start gap-2">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {partner.name}
                </span>
                {badge && (
                  <StatusBadge icon={null} variant={badge.variant}>
                    {badge.label}
                  </StatusBadge>
                )}
              </div>
            </div>
            <div className="flex min-w-[40%] shrink grow basis-1/2 flex-wrap items-center justify-end gap-2">
              {partner.link && (
                <button
                  type="button"
                  title="Copy link"
                  onClick={() => {
                    if (!partner.link) return;
                    toast.promise(copyToClipboard(partner.link.shortLink), {
                      success: "Copied to clipboard",
                    });
                  }}
                  className="group flex min-w-0 items-center gap-1 overflow-hidden rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 transition-colors duration-100 hover:bg-neutral-200/70 active:bg-neutral-200"
                >
                  <div className="relative size-3 shrink-0 text-neutral-600">
                    <Link2 className="absolute left-0 top-0 size-3 transition-[opacity,transform] duration-150 group-hover:-translate-y-2 group-hover:opacity-0" />
                    <Copy className="absolute left-0 top-0 size-3 translate-y-2 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100" />
                  </div>
                  <span className="truncate">
                    {getPrettyUrl(partner.link.shortLink)}
                  </span>
                </button>
              )}
              {partner.country && (
                <div className="flex min-w-20 items-center gap-2 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${partner.country}.svg`}
                    className="h-3 w-4"
                  />
                  <span className="truncate">{COUNTRIES[partner.country]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex divide-x divide-neutral-200">
            {[
              [
                "Revenue",
                !partner.link
                  ? "-"
                  : currencyFormatter(saleAmount, {
                      minimumFractionDigits: saleAmount % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    }),
              ],
              ["Sales", !partner.link ? "-" : partner.link?.sales],
              [
                "Earnings",
                currencyFormatter(earnings, {
                  minimumFractionDigits: earnings % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                }),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col px-5 first:pl-0">
                <span className="text-xs text-neutral-500">{label}</span>
                <span className="text-base text-neutral-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <ToggleGroup
              className="grid w-full grid-cols-2 rounded-lg border-transparent bg-neutral-100 p-0.5"
              optionClassName="justify-center text-neutral-600 hover:text-neutral-700"
              indicatorClassName="rounded-md bg-white"
              options={[
                { value: "overview", label: "Overview" },
                { value: "payouts", label: "Payouts" },
              ]}
              selected={selectedTab}
              selectAction={(value) => setSelectedTab(value as any)}
            />
          </div>
          <div className="mt-6">
            {selectedTab === "overview" && (
              <div className="flex flex-col gap-6 text-sm text-neutral-500">
                <h3 className="text-base font-semibold text-neutral-900">
                  About this partner
                </h3>

                <div>
                  <h4 className="font-semibold text-neutral-900">
                    Description
                  </h4>
                  <p className="mt-1.5">
                    {partner.bio || (
                      <span className="italic text-neutral-400">
                        No description provided
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {selectedTab === "payouts" && <PartnerPayouts partner={partner} />}
          </div>
        </div>
      </div>

      {partner.status === "pending" && (
        <div className="flex grow flex-col justify-end">
          <div className="border-t border-neutral-200 p-5">
            <PartnerApproval partner={partner} setIsOpen={setIsOpen} />
          </div>
        </div>
      )}
    </>
  );
}

function PartnerApproval({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const [isApproving, setIsApproving] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    if (selectedLinkId) setLinkError(false);
  }, [selectedLinkId]);

  const { executeAsync, isExecuting } = useAction(approvePartnerAction, {
    onSuccess() {
      mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`/api/programs/${partner.programId}/partners`),
        undefined,
        { revalidate: true },
      );

      toast.success("Approved the partner successfully.");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to approve partner.");
    },
  });

  const createLink = async (search: string) => {
    if (!search) throw new Error("No link entered");

    const shortKey = search.startsWith(program?.domain + "/")
      ? search.substring((program?.domain + "/").length)
      : search;

    const response = await fetch(`/api/links?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: program?.domain,
        key: shortKey,
        url: program?.url,
        trackConversion: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const { error } = result;
      throw new Error(error.message);
    }

    setSelectedLinkId(result.id);

    return result.id;
  };

  return (
    <div className="flex">
      <div
        className={cn(
          "transition-[width] duration-300",
          isApproving ? "w-[52px]" : "w-[83px]",
        )}
      >
        {isApproving ? (
          <Button
            type="button"
            variant="secondary"
            icon={<ChevronLeft className="size-4 shrink-0" />}
            onClick={() => {
              setIsApproving(false);
              setSelectedLinkId(null);
            }}
          />
        ) : (
          <PartnerRejectButton partner={partner} setIsOpen={setIsOpen} />
        )}
      </div>

      <div className="flex grow pl-2">
        <div
          className={cn(
            "w-0 transition-[width] duration-300",
            isApproving && "w-full",
          )}
        >
          <div className="w-[calc(100%-8px)]">
            <PartnerLinkSelector
              programDomain={program?.domain ?? undefined}
              selectedLinkId={selectedLinkId}
              setSelectedLinkId={setSelectedLinkId}
              showDestinationUrl={false}
              onCreate={async (search) => {
                try {
                  await createLink(search);
                  return true;
                } catch (error) {
                  toast.error(error?.message ?? "Failed to create link");
                }
                return false;
              }}
              domain={program?.domain ?? undefined}
              error={linkError}
            />
          </div>
        </div>

        <div className="grow">
          <Button
            type="button"
            variant="primary"
            text="Approve"
            loading={isExecuting}
            onClick={async () => {
              if (!isApproving) {
                setIsApproving(true);
                setLinkError(false);
                return;
              }

              if (!selectedLinkId) {
                setLinkError(true);
                return;
              }

              // Approve partner
              await executeAsync({
                workspaceId: workspaceId!,
                partnerId: partner.id,
                programId: partner.programId,
                linkId: selectedLinkId,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PartnerRejectButton({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isExecuting } = useAction(rejectPartner, {
    onSuccess() {
      mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`/api/programs/${partner.programId}/partners`),
        undefined,
        { revalidate: true },
      );
    },
  });

  return (
    <Button
      type="button"
      variant="secondary"
      text={isExecuting ? "" : "Decline"}
      loading={isExecuting}
      onClick={async () => {
        // Reject partner
        const result = await executeAsync({
          workspaceId: workspaceId!,
          partnerId: partner.id,
          programId: partner.programId,
        });

        if (!result?.data?.ok) {
          toast.error(result?.data?.error ?? "Failed to reject partner");
          return;
        }

        toast.success("Partner rejected");

        setIsOpen(false);
      }}
    />
  );
}

function PartnerPayouts({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();
  const router = useRouter();

  const { payoutsCount, error: payoutsCountError } = usePayoutsCount({
    query: { partnerId: partner.id },
  });

  const { pagination, setPagination } = useTablePagination({
    page: 1,
    pageSize: PAYOUTS_MAX_PAGE_SIZE,
  });

  const { payouts, error: payoutsError } = usePayouts({
    query: { partnerId: partner.id },
  });

  const countLoading = !payoutsCount && !payoutsCountError;
  const payoutsLoading = !payouts && !payoutsError;
  const isLoading = countLoading || payoutsLoading;

  const showPagination =
    payoutsCount?.all && payoutsCount.all > PAYOUTS_MAX_PAGE_SIZE;

  const table = useTable({
    data: payouts || [],
    loading: isLoading,
    error:
      payoutsError || payoutsCountError ? "Failed to load payouts" : undefined,
    columns: [
      {
        id: "periodEnd",
        header: "Period End",
        accessorFn: (d) => formatDate(d.periodStart, { month: "short" }),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];
          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "total",
        header: "Total",
        accessorFn: (d) =>
          currencyFormatter(d.total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    onRowClick: (row) => {
      router.push(
        `/${slug}/programs/${partner.programId}/payouts?payoutId=${row.original.id}`,
      );
    },
    ...(showPagination && {
      pagination,
      onPaginationChange: setPagination,
      rowCount: payoutsCount?.all || 0,
    }),
    resourceName: (p) => `payout${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: cn(
      !showPagination && "[&_tr:last-child>td]:border-b-transparent", // Hide bottom row border
    ),
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return payouts?.length || isLoading ? (
    <>
      <Table {...table} />
      <div className="mt-2 flex justify-end">
        <Link
          href={`/${slug}/programs/${partner.programId}/payouts?partnerId=${partner.id}`}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-7 items-center rounded-lg border px-2 text-sm",
          )}
        >
          View all
        </Link>
      </div>
    </>
  ) : (
    <AnimatedEmptyState
      className="md:min-h-80"
      title="No payouts"
      description="When this partner is eligible for or has received payouts, they will appear here."
      cardContent={() => (
        <>
          <div className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
            <GreekTemple className="size-4 text-neutral-700" />
          </div>
          <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}

export function PartnerDetailsSheet({
  isOpen,
  ...rest
}: PartnerDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId" })}
    >
      <PartnerDetailsSheetContent {...rest} />
    </Sheet>
  );
}
