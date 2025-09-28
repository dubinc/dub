import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, ChevronRight, Table, useTable } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { cn, nFormatter, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RewardIconSquare } from "./reward-icon-square";

export function RewardPartnersCard({ groupId }: { groupId: string }) {
  const { partners } = usePartners({
    query: { groupId, pageSize: 10 },
  });
  const { partnersCount } = usePartnersCount<number | undefined>({ groupId });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        disabled={partnersCount === undefined}
        className={cn(
          "flex w-full items-center justify-between gap-4 p-2.5 pr-4",
          partnersCount === undefined && "cursor-not-allowed",
        )}
      >
        <div className="text-content-emphasis flex items-center gap-2.5 font-medium">
          <RewardIconSquare icon={Users} />
          {partnersCount === undefined ? (
            <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <span>
              {partnersCount === 0 ? (
                "No partners selected"
              ) : (
                <>
                  To{" "}
                  <PartnerPreviewOrCount
                    previewPartners={partners?.slice(0, 3) || []}
                    partnersCount={partnersCount}
                    isExpanded={isExpanded}
                  />
                </>
              )}
            </span>
          )}
        </div>
        <ChevronRight
          className={cn(
            "text-content-subtle size-3 transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      </button>

      <motion.div
        className={cn(
          "overflow-hidden transition-opacity duration-200",
          !isExpanded && "opacity-0",
        )}
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-50 p-2.5">
          <PartnersCompactTable
            partners={partners}
            partnersCount={partnersCount || 0}
            groupId={groupId}
          />
        </div>
      </motion.div>
    </div>
  );
}

function PartnersCompactTable({
  partners,
  partnersCount,
  groupId,
}: {
  partners?: EnrolledPartnerProps[];
  partnersCount: number;
  groupId: string;
}) {
  const { slug } = useParams<{ slug: string }>();

  const { table, ...tableProps } = useTable({
    data: partners || [],
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={row.original.image || `${OG_AVATAR_URL}${row.original.name}`}
              alt={row.original.name}
              className="size-6 shrink-0 rounded-full"
            />
            <span className="truncate text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
        size: 180,
        minSize: 180,
        maxSize: 180,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 160,
        minSize: 160,
        maxSize: 160,
      },
    ],
    thClassName: "border-l-0",
    tdClassName: (columnId: string) =>
      cn("border-l-0", columnId !== "menu" && "max-w-0 truncate"),
    resourceName: (p: boolean) => `partner${p ? "s" : ""}`,
    rowCount: partners?.length || 0,
  });

  return (
    <div className="relative">
      {partners?.length ? (
        <>
          <Table
            {...tableProps}
            table={table}
            containerClassName="border"
            scrollWrapperClassName="overflow-x-hidden"
          />
          {partnersCount > 10 && (
            <div className="mt-2 flex justify-end">
              <Link
                href={`/${slug}/program/partners?groupId=${groupId}`}
                target="_blank"
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 w-fit rounded-lg px-2.5"
                  text="View all"
                />
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="text-content-muted flex h-24 items-center justify-center text-sm">
          No partners found.
        </div>
      )}
    </div>
  );
}

function PartnerPreviewOrCount({
  previewPartners,
  partnersCount,
  isExpanded,
}: {
  previewPartners: EnrolledPartnerProps[];
  partnersCount: number;
  isExpanded: boolean;
}) {
  const showAvatars = !isExpanded && partnersCount > 0;

  return (
    <span className="relative">
      <span
        className={cn(
          "transition-[transform,opacity] duration-200",
          showAvatars && "pointer-events-none -translate-y-0.5 opacity-0",
        )}
      >
        <strong className="font-semibold">
          {nFormatter(partnersCount, { full: true })}
        </strong>{" "}
        {partnersCount && pluralize("partner", partnersCount)}
      </span>

      <span
        className={cn(
          "absolute left-2 top-1/2 inline-flex min-w-full -translate-y-1/2 items-center align-text-top transition-[transform,opacity] duration-200",
          !showAvatars && "pointer-events-none translate-y-0.5 opacity-0",
        )}
      >
        {previewPartners.map(({ id, name, image }) => (
          <img
            key={id}
            src={image || `${OG_AVATAR_URL}${name}`}
            alt={`${name} avatar`}
            title={name}
            className="-ml-1.5 size-[1.125rem] shrink-0 rounded-full border border-white"
          />
        ))}
        {partnersCount > 3 && (
          <span className="text-content-subtle ml-1 text-xs">
            +{nFormatter(partnersCount - 3, { full: true })}
          </span>
        )}
      </span>
    </span>
  );
}
