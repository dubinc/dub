import z from "@/lib/zod";
import { LeaderboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Crown, Table, Users, useTable } from "@dub/ui";
import {
  currencyFormatter,
  fetcher,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { motion } from "framer-motion";
import useSWR from "swr";

export function EmbedLeaderboard() {
  const { data: partners, isLoading } = useSWR<
    z.infer<typeof LeaderboardPartnerSchema>[]
  >("/api/embed/leaderboard", fetcher, {
    keepPreviousData: true,
  });

  const { table, ...tableProps } = useTable({
    data: partners || [],
    loading: isLoading,
    columns: [
      {
        id: "position",
        header: "Position",
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-start gap-2 tabular-nums">
              {row.index + 1}
              {row.index <= 2 && (
                <Crown
                  className={cn("size-4", {
                    "text-amber-400": row.index === 0,
                    "text-neutral-400": row.index === 1,
                    "text-yellow-900": row.index === 2,
                  })}
                />
              )}
            </div>
          );
        },
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          return row.original.partner.name;
        },
      },
      {
        id: "sales",
        header: "Sales",
        cell: ({ row }) => {
          return currencyFormatter(row.original.link?.saleAmount / 100 ?? 0, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
    ],
    emptyState: (
      <AnimatedEmptyState
        title="No partners found"
        description="No partners have been added to this program yet."
        cardContent={() => (
          <>
            <Users className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
        className="border-none md:min-h-fit"
      />
    ),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `partner${plural ? "s" : ""}`,
  });

  return (
    <motion.div
      className="relative rounded-md border border-neutral-200"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-none max-h-[26rem] overflow-auto"
      />
      <div className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0" />
    </motion.div>
  );
}
