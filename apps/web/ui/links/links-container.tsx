"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { LinkWithTagsProps, UserProps } from "@/lib/types";
import {
  MaxWidthWrapper,
  Table,
  useMediaQuery,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { PAGINATION_LIMIT } from "@dub/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LinkDetailsColumn } from "./link-details-column";
import { LinkTitleColumn } from "./link-title-column";

export const linkViewModes = ["cards", "rows"] as const;
export type LinksViewMode = (typeof linkViewModes)[number];

export type ResponseLink = LinkWithTagsProps & {
  user: UserProps;
};

export default function LinksContainer({
  AddEditLinkButton,
  viewMode,
}: {
  AddEditLinkButton: () => JSX.Element;
  viewMode: LinksViewMode;
}) {
  const { links, isValidating } = useLinks();
  const { data: count } = useLinksCount();

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <LinksList
        AddEditLinkButton={AddEditLinkButton}
        links={links}
        count={count}
        loading={isValidating}
        compact={viewMode === "rows"}
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

  const { isMobile } = useMediaQuery();

  const columns: ColumnDef<ResponseLink, any>[] = useMemo(
    () => [
      {
        id: "link",
        accessorFn: (d) => d,
        cell: ({ getValue }) => (
          <LinkTitleColumn link={getValue() as ResponseLink} />
        ),
        enableHiding: false,
        size: 10000,
      },
      {
        id: "details",
        accessorFn: (d) => d,
        cell: ({ getValue }) => (
          <LinkDetailsColumn link={getValue() as ResponseLink} />
        ),
        size: isMobile ? 80 : 400,
      },
    ],
    [isMobile],
  );

  const [pagination, setPagination] = useState({
    pageIndex: currentPage - 1,
    pageSize: PAGINATION_LIMIT,
  });

  useEffect(() => {
    queryParams(
      pagination.pageIndex === 0
        ? { del: "page" }
        : {
            set: {
              page: (pagination.pageIndex + 1).toString(),
            },
          },
    );
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
