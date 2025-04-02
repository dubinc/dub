import { SHEET_MAX_ITEMS } from "@/lib/partners/constants";
import usePayouts from "@/lib/swr/use-payouts";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { ThreeDots, X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  MenuItem,
  Popover,
  Sheet,
  StatusBadge,
  Table,
  TabSelect,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { GreekTemple, User, UserDelete } from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { LockOpen } from "lucide-react";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { useBanPartnerModal } from "./ban-partner-modal";
import { useCreatePayoutSheet } from "./create-payout-sheet";
import { usePartnerApplicationSheet } from "./partner-application-sheet";
import { PartnerInfoSection } from "./partner-info-section";
import { usePartnerProfileSheet } from "./partner-profile-sheet";
import { PayoutStatusBadges } from "./payout-status-badges";
import { useUnbanPartnerModal } from "./unban-partner-modal";

type PartnerDetailsSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type Tab = "payouts" | "links";

function PartnerDetailsSheetContent({ partner }: PartnerDetailsSheetProps) {
  const { slug } = useWorkspace();
  const { program } = useProgram();
  const [tab, setTab] = useState<Tab>("links");

  const { createPayoutSheet, setIsOpen: setCreatePayoutSheetOpen } =
    useCreatePayoutSheet({ nested: true, partnerId: partner.id });

  const showPartnerDetails =
    partner.status === "approved" || partner.status === "banned";

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between p-6">
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
      </div>

      <div className="flex grow flex-col">
        <div className="border-y border-neutral-200 bg-neutral-50 p-6">
          {/* Basic info */}
          <PartnerInfoSection partner={partner}>
            <Menu partner={partner} />
          </PartnerInfoSection>

          {/* Stats */}
          {showPartnerDetails && (
            <div className="xs:grid-cols-3 mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                [
                  "Clicks",
                  !partner.clicks
                    ? "-"
                    : nFormatter(partner.clicks, { full: true }),
                ],
                [
                  "Leads",
                  !partner.leads
                    ? "-"
                    : nFormatter(partner.leads, { full: true }),
                ],
                [
                  "Sales",
                  !partner.sales
                    ? "-"
                    : nFormatter(partner.sales, { full: true }),
                ],
                [
                  "Revenue",
                  !partner.saleAmount
                    ? "-"
                    : currencyFormatter(partner.saleAmount / 100, {
                        minimumFractionDigits:
                          partner.saleAmount % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      }),
                ],
                [
                  "Commissions",
                  !partner.commissions
                    ? "-"
                    : currencyFormatter(partner.commissions / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                ],
                [
                  "Net revenue",
                  !partner.netRevenue
                    ? "-"
                    : currencyFormatter(partner.netRevenue / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col bg-neutral-50 p-3">
                  <span className="text-xs text-neutral-500">{label}</span>
                  <span className="text-base text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* <div className="xs:grid-cols-2 mt-4 grid grid-cols-1 gap-3">
            <Link
              href={`/${slug}/analytics?programId=${program!.id}&partnerId=${partner.id}&interval=all`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center justify-center gap-2 rounded-lg border px-2 text-sm",
              )}
            >
              <LinesY className="size-4 text-neutral-900" />
              Analytics
            </Link>
            <Link
              href={`/${slug}/events?programId=${program!.id}&partnerId=${partner.id}&interval=all`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center justify-center gap-2 rounded-lg border px-2 text-sm",
              )}
            >
              <CursorRays className="size-4 text-neutral-900" />
              Events
            </Link>
          </div> */}

          {showPartnerDetails && (
            <div className="-mb-6 mt-2 flex items-center gap-2">
              <TabSelect
                options={[
                  { id: "links", label: "Links" },
                  { id: "payouts", label: "Payouts" },
                  {
                    id: "sales",
                    label: "Sales",
                    href: `/${slug}/programs/${program!.id}/sales?partnerId=${partner.id}`,
                  },
                ]}
                selected={tab}
                onSelect={(id: Tab) => {
                  setTab(id);
                }}
              />
            </div>
          )}
        </div>

        <div className="grow overflow-y-auto p-6">
          {showPartnerDetails && (
            <>
              {tab === "payouts" && <PartnerPayouts partner={partner} />}
              {tab === "links" && <PartnerLinks partner={partner} />}
            </>
          )}

          {partner.status === "invited" && (
            <p className="text-sm text-neutral-500">
              This partner has not accepted the invitation yet.
            </p>
          )}
        </div>
      </div>

      {showPartnerDetails && (
        <>
          {createPayoutSheet}
          <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
            <div className="p-5">
              <Button
                variant="primary"
                text="Create payout"
                onClick={() => setCreatePayoutSheetOpen(true)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PartnerPayouts({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();
  const { program } = useProgram();

  const {
    payouts,
    error: payoutsError,
    loading,
  } = usePayouts({
    query: { partnerId: partner.id, pageSize: SHEET_MAX_ITEMS },
  });

  const table = useTable({
    data: payouts || [],
    loading: loading,
    error: payoutsError ? "Failed to load payouts" : undefined,
    columns: [
      {
        header: "Period",
        accessorFn: (d) => formatPeriod(d),
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
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    onRowClick: (row) => {
      window.open(
        `/${slug}/programs/${program!.id}/payouts?payoutId=${row.original.id}`,
        "_blank",
      );
    },
    resourceName: (p) => `payout${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return (payouts && payouts.length > 0) || loading ? (
    <>
      <Table {...table} />
      <div className="mt-2 flex justify-end">
        <Link
          href={`/${slug}/programs/${program!.id}/payouts?partnerId=${partner.id}`}
          target="_blank"
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

const PartnerLinks = ({ partner }: { partner: EnrolledPartnerProps }) => {
  const { slug } = useWorkspace();

  const table = useTable({
    data: partner.links || [],
    columns: [
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => (
          <b className="font-medium text-black">
            {getPrettyUrl(row.original.shortLink)}
          </b>
        ),
      },
      {
        header: "Clicks",
        accessorFn: (d) => nFormatter(d.clicks),
        size: 1,
        minSize: 1,
      },
      {
        header: "Leads",
        accessorFn: (d) => nFormatter(d.leads),
        size: 1,
        minSize: 1,
      },
      {
        header: "Sales",
        accessorFn: (d) => nFormatter(d.sales),
        size: 1,
        minSize: 1,
      },
      {
        header: "Revenue",
        accessorFn: (d) =>
          currencyFormatter(d.saleAmount / 100, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
        size: 1,
        minSize: 1,
      },
    ],
    onRowClick: (row) => {
      window.open(
        `/${slug}/events?domain=${row.original.domain}&key=${row.original.key}&interval=all`,
        "_blank",
      );
    },
    resourceName: (p) => `link${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return <Table {...table} />;
};

function Menu({ partner }: { partner: EnrolledPartnerProps }) {
  const [openPopover, setOpenPopover] = useState(false);

  const { partnerProfileSheet, setIsOpen: setPartnerProfileSheetOpen } =
    usePartnerProfileSheet({ nested: true, partner });

  const { partnerApplicationSheet, setIsOpen: setPartnerApplicationSheetOpen } =
    usePartnerApplicationSheet({ nested: true, partner });

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner,
  });

  const { UnbanPartnerModal, setShowUnbanPartnerModal } = useUnbanPartnerModal({
    partner,
  });

  return (
    <>
      {partnerProfileSheet}
      {partnerApplicationSheet}
      <BanPartnerModal />
      <UnbanPartnerModal />

      <div className="flex items-center gap-2">
        {(partner.status === "approved" || partner.status === "banned") && (
          <Button
            variant="secondary"
            text="View profile"
            onClick={() => setPartnerProfileSheetOpen(true)}
            className="h-8 w-fit"
          />
        )}

        <Popover
          content={
            <div className="grid w-full gap-px p-1.5 sm:w-44">
              {partner.applicationId && (
                <MenuItem
                  icon={User}
                  onClick={() => {
                    setOpenPopover(false);
                    setPartnerApplicationSheetOpen(true);
                  }}
                >
                  View application
                </MenuItem>
              )}

              {partner.status !== "banned" ? (
                <MenuItem
                  icon={UserDelete}
                  variant="danger"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowBanPartnerModal(true);
                  }}
                >
                  Ban partner
                </MenuItem>
              ) : (
                <MenuItem
                  icon={LockOpen}
                  onClick={() => {
                    setOpenPopover(false);
                    setShowUnbanPartnerModal(true);
                  }}
                >
                  Unban partner
                </MenuItem>
              )}
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <Button
            variant="secondary"
            className={cn(
              "h-8 w-fit px-1.5 outline-none transition-all duration-200",
              "data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
            )}
            icon={
              <ThreeDots className="size-[1.125rem] shrink-0 text-neutral-600" />
            }
            onClick={() => {
              setOpenPopover(!openPopover);
            }}
          />
        </Popover>
      </div>
    </>
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
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
    >
      <PartnerDetailsSheetContent {...rest} />
    </Sheet>
  );
}
