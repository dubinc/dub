"use client";

import { PlanProps } from "@/lib/types";
import {
  ADMIN_RECENT_PROGRAMS_PAGE_SIZE,
  adminRecentProgramSchema,
} from "@/lib/zod/schemas/admin";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import PlanBadge from "@/ui/workspaces/plan-badge";
import {
  GridIcon,
  LoadingSpinner,
  PaginationControls,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateSmart,
  getDomainWithoutWWW,
  isSafeLinkHref,
  nFormatter,
  OG_AVATAR_URL,
  PARTNERS_DOMAIN,
} from "@dub/utils";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

type AdminRecentProgram = z.infer<typeof adminRecentProgramSchema>;

const GRID_COLS = "grid-cols-[minmax(0,1fr)_140px_120px_160px_140px]";

export default function RecentProgramsPage() {
  return (
    <Suspense>
      <RecentProgramsPageClient />
    </Suspense>
  );
}

function RecentProgramsPageClient() {
  const { getQueryString } = useRouterStuff();
  const { pagination, setPagination } = usePagination(
    ADMIN_RECENT_PROGRAMS_PAGE_SIZE,
  );
  const [programToAdd, setProgramToAdd] = useState<AdminRecentProgram | null>(
    null,
  );

  const {
    data: { programs, total } = {},
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{
    programs: AdminRecentProgram[];
    total: number;
  }>(
    `/api/admin/programs/recent${getQueryString({
      pageSize: String(ADMIN_RECENT_PROGRAMS_PAGE_SIZE),
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Add marketplace program",
    description: programToAdd ? (
      <>
        Add{" "}
        <span className="font-medium text-neutral-900">
          {programToAdd.name}
        </span>{" "}
        to marketplace listings? This will make it visible to all partners on{" "}
        <a
          href="https://dub.co/marketplace"
          target="_blank"
          className="font-medium text-neutral-900 underline decoration-neutral-300 decoration-dotted underline-offset-2"
        >
          dub.co/marketplace
        </a>
      </>
    ) : null,
    confirmText: "Add",
    cancelText: "Cancel",
    onCancel: () => setProgramToAdd(null),
    onConfirm: async () => {
      if (!programToAdd) return;

      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programSlug: programToAdd.slug,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || "Failed to add program.");
        throw new Error(message);
      }

      await mutate();
      toast.success("Program added to marketplace.");
      setProgramToAdd(null);
    },
  });

  return (
    <>
      {confirmModal}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading && !programs ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-500">
            <LoadingSpinner className="size-4" />
            Loading recent programs...
          </div>
        ) : !programs?.length ? (
          <div className="px-5 py-10 text-center text-sm text-neutral-500">
            No active programs found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div
                className={cn("min-w-[1010px]", isValidating && "opacity-50")}
              >
                <div
                  className={cn(
                    "grid items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500",
                    GRID_COLS,
                  )}
                >
                  <div>Program</div>
                  <div>Plan</div>
                  <div>Partners</div>
                  <div>Commissions (30D)</div>
                  <div>Created</div>
                </div>
                <div className="divide-y divide-neutral-200">
                  {programs.map((program) => (
                    <RecentProgramRow
                      key={program.id}
                      program={program}
                      onAddToMarketplace={() => {
                        setProgramToAdd(program);
                        setShowConfirmModal(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-200 px-4 py-2">
              <PaginationControls
                pagination={pagination}
                setPagination={setPagination}
                totalCount={total ?? 0}
                unit={(plural) => `program${plural ? "s" : ""}`}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function RecentProgramRow({
  program,
  onAddToMarketplace,
}: {
  program: AdminRecentProgram;
  onAddToMarketplace: () => void;
}) {
  const programUrl =
    program.url && isSafeLinkHref(program.url)
      ? program.url
      : `${PARTNERS_DOMAIN}/${program.slug}`;
  const listedAt = program.addedToMarketplaceAt;

  const marketplaceIcon = (
    <GridIcon className="size-3.5 shrink-0" aria-hidden />
  );

  return (
    <div className={cn("grid items-center gap-3 px-4 py-2.5", GRID_COLS)}>
      <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium">
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          width={20}
          height={20}
          className="size-4 rounded-full"
        />
        <span className="text-sm font-medium">{program.name}</span>•
        <a
          className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
          href={programUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {getDomainWithoutWWW(programUrl)}
        </a>
        {listedAt ? (
          <Tooltip
            content={
              <div className="max-w-[220px] px-3 py-2.5 text-center">
                <p className="text-sm font-medium text-neutral-900">
                  Dub Marketplace
                </p>
                <p className="mt-1 text-xs leading-snug text-neutral-500">
                  Listed since{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(listedAt))}
                </p>
                <p className="mt-2 text-xs font-medium text-teal-700">
                  Click to open listing ↗
                </p>
              </div>
            }
          >
            <a
              href={`https://partners.dub.co/marketplace/${program.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
                "border border-teal-200/90 bg-gradient-to-br from-white to-teal-50/90",
                "text-teal-700 shadow-sm ring-1 ring-inset ring-white",
                "transition-[box-shadow,transform] duration-150 hover:shadow-md active:scale-[0.97]",
                "outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              )}
              aria-label={`View ${program.name} on Dub Marketplace (opens in new tab)`}
            >
              {marketplaceIcon}
            </a>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onAddToMarketplace}
            className={cn(
              "ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
              "border border-neutral-200 bg-white text-neutral-400",
              "transition-[box-shadow,transform,color] duration-150",
              "hover:bg-neutral-50 hover:text-neutral-600 hover:shadow-sm active:scale-[0.97]",
              "outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            )}
            aria-label={`Add ${program.name} to Dub Marketplace`}
          >
            {marketplaceIcon}
          </button>
        )}
      </div>

      <PlanBadge plan={program.plan as PlanProps} />
      <div className="text-sm tabular-nums text-neutral-700">
        {nFormatter(program.partners, { full: true })}
      </div>

      <div className="text-sm tabular-nums text-neutral-700">
        {currencyFormatter(program.commissions, {
          trailingZeroDisplay: "stripIfInteger",
        })}
      </div>

      <TimestampTooltip
        timestamp={program.createdAt}
        rows={["local", "utc", "unix"]}
        side="left"
      >
        <span className="cursor-default whitespace-nowrap text-sm tabular-nums text-neutral-600 underline decoration-neutral-300 decoration-dotted underline-offset-2">
          {formatDateSmart(program.createdAt, { month: "short" })}
        </span>
      </TimestampTooltip>
    </div>
  );
}
