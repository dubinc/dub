import { PARTNER_LINKS_LIMIT } from "@/lib/embed/constants";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button, CopyButton, Table, Users, useTable } from "@dub/ui";
import { Pen2, Plus2 } from "@dub/ui/icons";
import {
  currencyFormatter,
  fetcher,
  getPrettyUrl,
  nFormatter,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useEmbedToken } from "../use-embed-token";
import { ReferralsEmbedLink } from "./types";

interface Props {
  links: ReferralsEmbedLink[];
  onCreateLink: () => void;
  onEditLink: (link: ReferralsEmbedLink) => void;
}

export function ReferralsEmbedLinksList({
  links,
  onCreateLink,
  onEditLink,
}: Props) {
  const token = useEmbedToken();
  const [partnerLinks, setPartnerLinks] = useState<ReferralsEmbedLink[]>(links);

  const { data: refreshedLinks, isLoading } = useSWR<ReferralsEmbedLink[]>(
    "/api/embed/referrals/links",
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

  useEffect(() => {
    if (refreshedLinks) {
      setPartnerLinks(refreshedLinks);
    }
  }, [refreshedLinks]);

  const linksLimitReached = partnerLinks.length >= PARTNER_LINKS_LIMIT;

  const { table, ...tableProps } = useTable({
    data: partnerLinks,
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
        cell: ({ row }) => nFormatter(row.original.clicks),
      },
      {
        id: "leads",
        header: "Leads",
        minSize: 80,
        maxSize: 100,
        cell: ({ row }) => nFormatter(row.original.leads),
      },
      {
        id: "sales",
        header: "Sales",
        minSize: 80,
        maxSize: 100,
        cell: ({ row }) => currencyFormatter(row.original.saleAmount / 100),
      },
      {
        id: "actions",
        header: () => (
          <Button
            variant="primary"
            className="h-7 w-7 p-1.5"
            icon={<Plus2 className="size-4" />}
            onClick={onCreateLink}
            disabled={linksLimitReached}
            disabledTooltip={
              linksLimitReached
                ? `You have reached the limit of ${PARTNER_LINKS_LIMIT} referral links.`
                : undefined
            }
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
              onClick={() => onEditLink(row.original)}
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
        description="You don't have any referral links yet. Create a link to start earning commissions."
        cardContent={() => (
          <>
            <Users className="text-content-default size-4" />
            <div className="bg-bg-emphasis h-2.5 w-40 rounded-sm" />
          </>
        )}
        className="max-w-xs border-none md:min-h-fit"
        addButton={
          <Button
            text="Create link"
            variant="primary"
            onClick={onCreateLink}
            className="bg-bg-inverted h-9 rounded-md hover:bg-neutral-800"
          />
        }
      />
    ),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `link${plural ? "s" : ""}`,
    loading: isLoading,
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
      {links.length > 0 && (
        <div className="from-bg-default pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t sm:bottom-0" />
      )}
    </motion.div>
  );
}
