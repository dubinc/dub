"use client";

import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { StatusBadge, Table, useTable } from "@dub/ui";
import { fetcher, formatDateTime } from "@dub/utils";
import useSWR from "swr";

type NetworkPartner = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  createdAt: Date | string;
};

export default function NetworkApplicationsPage() {
  const { data, isLoading } = useSWR<{ partners: NetworkPartner[] }>(
    "/api/admin/partners/network",
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const partners = data?.partners ?? [];

  const { table, ...tableProps } = useTable({
    data: partners,
    columns: [
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <PartnerAvatar partner={row.original} className="size-8 bg-white" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-neutral-900">
                {row.original.name}
              </span>
              <span className="truncate text-xs text-neutral-500">
                {row.original.email ?? "No email"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: () => <StatusBadge variant="pending">Submitted</StatusBadge>,
      },
      {
        id: "createdAt",
        header: "Submitted At",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    loading: isLoading,
    resourceName: (plural) => `network application${plural ? "s" : ""}`,
    rowCount: partners.length,
  });

  return <Table {...tableProps} table={table} />;
}
