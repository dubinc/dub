"use client";

import useDiscountCodes from "@/lib/swr/use-discount-codes";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountCodeProps, EnrolledPartnerProps } from "@/lib/types";
import { DeleteDiscountCodeModal } from "@/ui/modals/delete-discount-code-modal";
import { useAddDiscountCodeModal } from "@/ui/partners/add-discount-code-modal";
import { useAddPartnerLinkModal } from "@/ui/partners/add-partner-link-modal";
import {
  Button,
  CopyButton,
  LoadingSpinner,
  Table,
  Tag,
  useTable,
} from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

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

  const [selectedDiscountCode, setSelectedDiscountCode] =
    useState<DiscountCodeProps | null>(null);

  const [showDeleteDiscountCodeModal, setShowDeleteDiscountCodeModal] =
    useState(false);

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
        id: "code",
        header: "Code",
        cell: ({ row }) => (
          <div className="group/discountcode relative flex h-5 w-fit items-center gap-1 rounded-lg bg-green-100 py-0 pl-1 pr-1.5 transition-colors duration-150 hover:bg-green-200">
            <Tag className="size-3 text-green-700" strokeWidth={1.5} />
            <div className="text-xs font-medium text-green-700 transition-colors">
              {row.original.code}
            </div>
            <span className="flex items-center">
              <CopyButton
                value={row.original.code}
                variant="neutral"
                className="p-0.5"
              />
            </span>
          </div>
        ),
      },
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => {
          const link = partner.links?.find((l) => l.id === row.original.linkId);
          return link ? (
            <Link
              href={`/${slug}/links/${link.domain}/${link.key}`}
              target="_blank"
              className="cursor-alias font-medium text-black decoration-dotted hover:underline"
            >
              {getPrettyUrl(link.shortLink)}
            </Link>
          ) : (
            <span className="text-neutral-500">Link not found</span>
          );
        },
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 25,
        size: 25,
        maxSize: 25,
        cell: ({ row }) => (
          <Button
            icon={<Trash className="size-3 text-neutral-600" />}
            variant="outline"
            className="h-8 whitespace-nowrap px-2"
            onClick={() => {
              setSelectedDiscountCode(row.original);
              setShowDeleteDiscountCodeModal(true);
            }}
          />
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

  const disabledReason = useMemo(() => {
    if (!partner.discountId) {
      return "No discount assigned to this partner group. Please add a discount before you can create a discount code.";
    }

    if (partner.links?.length === 0) {
      return "No links assigned to this partner group. Please add a link before you can create a discount code.";
    }

    if (partner.links?.length === discountCodes?.length) {
      return "All links have a discount code assigned to them. Please add a new link before you can create a discount code.";
    }

    return undefined;
  }, [partner.discountId, partner.links, discountCodes]);

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
          disabled={!!disabledReason}
          disabledTooltip={disabledReason}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : !error && (!discountCodes || discountCodes.length === 0) ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-6">
            <Tag className="mb-2 size-6 text-neutral-900" />
            <h3 className="text-content-emphasis text-sm font-semibold leading-5">
              No codes created
            </h3>
            <p className="text-content-default -mt-1 text-sm font-medium leading-5">
              Create a discount code for each link
            </p>
          </div>
        ) : error ? (
          <div className="flex justify-center py-16">
            <span className="text-content-subtle text-sm">
              Failed to load discount codes
            </span>
          </div>
        ) : (
          <Table {...table} />
        )}
      </div>

      <AddDiscountCodeModal />

      {selectedDiscountCode && (
        <DeleteDiscountCodeModal
          showModal={showDeleteDiscountCodeModal}
          setShowModal={setShowDeleteDiscountCodeModal}
          discountCode={selectedDiscountCode}
        />
      )}
    </>
  );
};
