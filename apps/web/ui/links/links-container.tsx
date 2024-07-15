"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { LinkWithTagsProps, UserProps } from "@/lib/types";
import {
  Avatar,
  LinkLogo,
  MaxWidthWrapper,
  Table,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  PAGINATION_LIMIT,
  formatDate,
  formatDateTime,
  getApexDomain,
} from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ResponseLink = LinkWithTagsProps & {
  user: UserProps;
};

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { links, isValidating } = useLinks();
  const { data: count } = useLinksCount();

  const [compact, setCompact] = useState(false);

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <button
        className="w-24 border border-gray-200 text-xs"
        onClick={() => setCompact((c) => !c)}
      >
        toggle compact
      </button>
      <LinksList
        AddEditLinkButton={AddEditLinkButton}
        links={links}
        count={count}
        loading={isValidating}
        compact={compact}
      />
    </MaxWidthWrapper>
  );
}

function LinksList({
  AddEditLinkButton,
  links,
  count,
  loading,
  compact,
}: {
  AddEditLinkButton: () => JSX.Element;
  links?: ResponseLink[];
  count?: number;
  loading?: boolean;
  compact: boolean;
}) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams?.get("page") || "1") || 1;

  const columns: ColumnDef<ResponseLink, any>[] = useMemo(
    () => [
      {
        id: "link",
        header: "Link",
        accessorFn: (d) => d,
        cell: ({ getValue }) => {
          const path = getValue().key === "_root" ? "" : `/${getValue().key}`;

          return (
            <div className="flex items-center gap-3">
              <LinkLogo
                apexDomain={getApexDomain(getValue().url)}
                className="h-4 w-4 sm:h-4 sm:w-4"
              />
              <span className="truncate" title={`${getValue().domain}${path}`}>
                <span className="font-medium text-gray-950">
                  {getValue().domain}
                </span>
                {path}
              </span>
            </div>
          );
        },
        enableHiding: false,
        size: 130,
      },
      {
        id: "url",
        header: "URL",
        accessorKey: "url",
        size: 130,
      },
      {
        id: "creator",
        header: "Creator",
        accessorFn: (d) => d.user,
        cell: ({ getValue }) => {
          const user = getValue() as ResponseLink["user"];
          return (
            <div className="flex items-center gap-3">
              <Avatar user={user} className="h-4 w-4" />
              <span className="truncate" title={user.name}>
                {user.name}
              </span>
            </div>
          );
        },
        size: 50,
      },
      {
        id: "created",
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ getValue }) => {
          const createdAt = getValue() as Date;

          return (
            <span title={formatDateTime(createdAt)}>
              {formatDate(createdAt)}
            </span>
          );
        },
        size: 50,
      },
      {
        id: "clicks",
        header: "Clicks",
        accessorKey: "clicks",
        size: 50,
      },
    ],
    [],
  );

  const [pagination, setPagination] = useState({
    pageIndex: currentPage - 1,
    pageSize: PAGINATION_LIMIT,
  });

  useEffect(() => {
    queryParams({
      set: {
        page: (pagination.pageIndex + 1).toString(),
      },
    });
  }, [pagination]);

  const { table, ...tableProps } = useTable({
    variant: compact ? "compact-list" : "loose-list",
    showColumnHeadings: false,
    data: links ?? [],
    loading,
    columns,
    pagination: pagination,
    rowCount: count ?? 0,
    onPaginationChange: setPagination,
    resourceName: (plural) => `link${plural ? "s" : ""}`,
  });

  return <Table table={table} {...tableProps} />;
}
