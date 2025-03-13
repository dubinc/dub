"use client";

import { EnrolledPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, LoadingSpinner, Table, Users, useTable } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { Dispatch, SetStateAction } from "react";

interface PartnersTableProps {
  selectedPartners: EnrolledPartnerProps[];
  setSelectedPartners: Dispatch<SetStateAction<EnrolledPartnerProps[]>>;
  loading: boolean;
  pagination?: any; // TODO: Type this properly
  setPagination?: any; // TODO: Type this properly
}

export function PartnersTable({
  selectedPartners,
  setSelectedPartners,
  loading,
  pagination,
  setPagination,
}: PartnersTableProps) {
  const partnersCount = selectedPartners?.length || 0;

  const table = useTable({
    data: selectedPartners,
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.image ||
                `${DICEBEAR_AVATAR_URL}${row.original.name}`
              }
              alt={row.original.name}
              className="size-6 shrink-0 rounded-full"
            />
            <span className="truncate text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
        size: 150,
        minSize: 150,
        maxSize: 150,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 210,
        minSize: 210,
        maxSize: 210,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={<X className="size-4" />}
              className="size-4 rounded-md border-0 bg-neutral-50 p-0 hover:bg-neutral-100"
              onClick={() => {
                setSelectedPartners((prev) =>
                  prev.filter((p) => p.id !== row.original.id),
                );
              }}
            />
          </div>
        ),
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
    ],
    loading,
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    pagination,
    onPaginationChange: setPagination,
    rowCount: partnersCount,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-neutral-200 bg-white py-8">
        <LoadingSpinner className="size-4" />
      </div>
    );
  }

  if (partnersCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 py-10">
        <div className="flex items-center justify-center">
          <Users className="size-5 text-neutral-500" />
        </div>
        <div className="flex flex-col items-center gap-1 px-4 text-center">
          <p className="text-sm font-medium text-neutral-600">
            Eligible partners
          </p>
          <p className="text-sm text-neutral-500">
            No eligible partners added yet
          </p>
        </div>
      </div>
    );
  }

  return <Table {...table} />;
}
