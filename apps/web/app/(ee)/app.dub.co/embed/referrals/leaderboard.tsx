import z from "@/lib/zod";
import { LeaderboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Crown, Table, Tooltip, Users, useTable } from "@dub/ui";
import {
  currencyFormatter,
  fetcher,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { motion } from "framer-motion";
import useSWR from "swr";
import { useEmbedToken } from "../../embed/use-embed-token";

export function ReferralsEmbedLeaderboard() {
  const token = useEmbedToken();

  const { data: partners, isLoading } = useSWR<
    z.infer<typeof LeaderboardPartnerSchema>[]
  >(
    "/api/embed/referrals/leaderboard",
    (url) =>
      fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable({
    data: partners || [],
    loading: isLoading,
    columns: [
      {
        id: "rank",
        header: "Rank",
        size: 40,
        minSize: 40,
        cell: ({ row }) => {
          return (
            <div className="flex w-8 items-center justify-start gap-1 tabular-nums">
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
        header: "Partner",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <img
                src={row.original.image}
                alt={row.original.name}
                className="size-5 rounded-full"
              />
              <Tooltip content="For privacy reasons, the name of the partner is anonymized.">
                <span className="cursor-help text-sm font-medium decoration-dotted underline-offset-2 hover:underline">
                  {row.original.name}
                </span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        id: "totalCommissions",
        header: "Earnings",
        cell: ({ row }) => {
          return currencyFormatter(row.original.totalCommissions / 100, {
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
            <Users className="text-content-default size-4" />
            <div className="bg-bg-emphasis h-2.5 w-24 min-w-0 rounded-sm" />
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
      className="border-border-subtle relative rounded-md border"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-none max-h-[26rem] overflow-auto"
      />
      <div className="from-bg-default pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t sm:bottom-0" />
    </motion.div>
  );
}
