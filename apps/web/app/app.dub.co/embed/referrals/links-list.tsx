import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Link } from "@dub/prisma/client";
import { Button, CopyButton, Table, Users, useTable } from "@dub/ui";
import { Pen2, Plus2 } from "@dub/ui/icons";
import { getPrettyUrl, TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";

export function ReferralsEmbedLinksList({ links }: { links: Link[] }) {
  const { table, ...tableProps } = useTable({
    data: links,
    columns: [
      {
        id: "link",
        header: "Link",
        minSize: 200,
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <CopyButton value={row.original.shortLink} />
              <span className="text-sm">
                {getPrettyUrl(row.original.shortLink)}
              </span>
            </div>
          );
        },
      },
      {
        id: "clicks",
        header: "Clicks",
        minSize: 80,
        maxSize: 100,
        cell: ({ row }) => row.original.clicks,
      },
      {
        id: "leads",
        header: "Leads",
        minSize: 80,
        maxSize: 100,
        cell: ({ row }) => row.original.leads,
      },
      {
        id: "sales",
        header: "Sales",
        minSize: 80,
        maxSize: 100,
        cell: ({ row }) => row.original.sales,
      },
      {
        id: "actions",
        header: () => (
          <Button
            variant="primary"
            className="h-7 w-7 p-1.5"
            icon={<Plus2 className="text-white" />}
          />
        ),
        minSize: 60,
        maxSize: 80,
        cell: ({ row }) => {
          return (
            <Button
              variant="secondary"
              className="h-7 w-7 p-1.5"
              icon={<Pen2 className="size-4" />}
            />
          );
        },
      },
    ],
    defaultColumn: {
      minSize: 60,
    },
    emptyState: (
      <AnimatedEmptyState
        title="No links found"
        description="No referral links found for you."
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
    resourceName: (plural) => `link${plural ? "s" : ""}`,
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
