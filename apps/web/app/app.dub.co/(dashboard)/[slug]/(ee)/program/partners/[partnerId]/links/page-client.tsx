"use client";

import useDiscountCodes from "@/lib/swr/use-discount-codes";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useAddDiscountCodeModal } from "@/ui/partners/add-discount-code-modal";
import { useAddPartnerLinkModal } from "@/ui/partners/add-partner-link-modal";
import { Button, CopyButton, LoadingSpinner, Table, useTable } from "@dub/ui";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ProgramPartnerLinksPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <div className="space-y-8">
      <PartnerLinks partner={partner} />
      <PartnerDiscountCodes partner={partner} />
    </div>
  ) : (
    <div className="flex justify-center py-16">
      {error ? (
        <span className="text-content-subtle text-sm">
          Failed to load partner links
        </span>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}

const PartnerLinks = ({ partner }: { partner: EnrolledPartnerProps }) => {
  const { slug } = useWorkspace();

  const { AddPartnerLinkModal, setShowAddPartnerLinkModal } =
    useAddPartnerLinkModal({
      partner,
    });

  const table = useTable({
    data: partner.links || [],
    columns: [
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/${slug}/links/${row.original.domain}/${row.original.key}`}
              target="_blank"
              className="cursor-alias font-medium text-black decoration-dotted hover:underline"
            >
              {getPrettyUrl(row.original.shortLink)}
            </Link>
            <CopyButton value={row.original.shortLink} className="p-0.5" />
          </div>
        ),
      },
      {
        header: "Clicks",
        size: 1,
        minSize: 1,
        cell: ({ row }) => (
          <Link
            href={`/${slug}/events?event=clicks&interval=all&domain=${row.original.domain}&key=${row.original.key}`}
            target="_blank"
            className="block w-full cursor-alias decoration-dotted hover:underline"
          >
            {nFormatter(row.original.clicks)}
          </Link>
        ),
      },
      {
        header: "Leads",
        size: 1,
        minSize: 1,
        cell: ({ row }) => (
          <Link
            href={`/${slug}/events?event=leads&interval=all&domain=${row.original.domain}&key=${row.original.key}`}
            target="_blank"
            className="block w-full cursor-alias decoration-dotted hover:underline"
          >
            {nFormatter(row.original.leads)}
          </Link>
        ),
      },
      {
        header: "Conversions",
        size: 1,
        minSize: 1,
        cell: ({ row }) => (
          <Link
            href={`/${slug}/events?event=sales&interval=all&domain=${row.original.domain}&key=${row.original.key}`}
            target="_blank"
            className="block w-full cursor-alias decoration-dotted hover:underline"
          >
            {nFormatter(row.original.conversions)}
          </Link>
        ),
      },
      {
        header: "Revenue",
        accessorFn: (d) =>
          currencyFormatter(d.saleAmount / 100, {
            trailingZeroDisplay: "stripIfInteger",
          }),
        size: 1,
        minSize: 1,
        cell: ({ row }) => (
          <Link
            href={`/${slug}/events?event=sales&interval=all&domain=${row.original.domain}&key=${row.original.key}`}
            target="_blank"
            className="block w-full cursor-alias decoration-dotted hover:underline"
          >
            {currencyFormatter(row.original.saleAmount / 100, {
              trailingZeroDisplay: "stripIfInteger",
            })}
          </Link>
        ),
      },
    ],
    resourceName: (p) => `link${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">Links</h2>
        <Button
          variant="secondary"
          text="Create link"
          className="h-8 w-fit rounded-lg px-3 py-2 font-medium"
          onClick={() => setShowAddPartnerLinkModal(true)}
        />
      </div>
      <div className="mt-4">
        <Table {...table} />
      </div>
      <AddPartnerLinkModal />
    </>
  );
};

const PartnerDiscountCodes = ({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) => {
  const { slug } = useWorkspace();
  const { discountCodes, loading, error } = useDiscountCodes({
    partnerId: partner.id || null,
  });

  const { AddDiscountCodeModal, setShowAddDiscountCodeModal } =
    useAddDiscountCodeModal({
      partner,
    });

  const table = useTable({
    data: discountCodes || [],
    columns: [
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => {
          const link = partner.links?.find((l) => l.id === row.original.linkId);
          return link ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/${slug}/links/${link.domain}/${link.key}`}
                target="_blank"
                className="cursor-alias font-medium text-black decoration-dotted hover:underline"
              >
                {getPrettyUrl(link.shortLink)}
              </Link>
              <CopyButton value={link.shortLink} className="p-0.5" />
            </div>
          ) : (
            <span className="text-neutral-500">Link not found</span>
          );
        },
      },
      {
        id: "code",
        header: "Discount code",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm">{row.original.code}</span>
            <CopyButton value={row.original.code} className="p-0.5" />
          </div>
        ),
      },
    ],
    resourceName: (p) => `discount code${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading,
    error: error ? "Failed to load discount codes" : undefined,
  } as any);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">
          Discount codes
        </h2>
        <Button
          variant="secondary"
          text="Create code"
          className="h-8 w-fit rounded-lg px-3 py-2 font-medium"
          onClick={() => setShowAddDiscountCodeModal(true)}
          disabled={!partner.discountId}
          disabledTooltip={
            !partner.discountId
              ? "No discount assigned to this partner group. Please add a discount before you can create a discount code."
              : undefined
          }
        />
      </div>
      <div className="mt-4">
        <Table {...table} />
      </div>
      <AddDiscountCodeModal />
    </>
  );
};
