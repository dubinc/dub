"use client";

import { usePartnerReferral } from "@/lib/partner-referrals/hooks/use-partner-referral";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import usePartner from "@/lib/swr/use-partner";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { CopyButton, LoadingSpinner, Table, useTable } from "@dub/ui";
import { cn, currencyFormatter, getPrettyUrl, nFormatter } from "@dub/utils";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { PartnerDiscountCodes } from "./discount-codes";
import { ReferralLinks } from "./referral-links";

export default function ProgramPartnerLinksPage() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <div className="grid min-w-0 gap-4">
      <ReferralLinks partner={partner} />
      <PartnerDiscountCodes partner={partner} />
      <PartnerReferralLink partner={partner} />
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

const PartnerReferralLink = ({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) => {
  const { slug } = useWorkspace();
  const router = useRouter();
  const {
    program,
    loading: loadingProgram,
    error: errorProgram,
  } = useProgram();
  const {
    referral,
    loading: loadingReferral,
    error: referralError,
  } = usePartnerReferral({
    partnerId: partner.id,
  });

  const referralLink = constructPartnerReferralLink({
    partner,
    program,
  });

  const data = useMemo(() => {
    if (!referralLink || !referral?.stats) {
      return [];
    }

    return [
      {
        link: referralLink,
        totalPartners: referral.stats.totalPartners,
        totalConversions: referral.stats.totalConversions,
        totalSaleAmount: referral.stats.totalSaleAmount,
      },
    ];
  }, [referralLink, referral]);

  const referredPartnersUrl = `/${slug}/program/partners?referredByPartnerId=${partner.id}`;

  const table = useTable({
    data,
    columns: [
      {
        id: "link",
        header: "Link",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="font-medium text-black">
              {getPrettyUrl(row.original.link)}
            </span>
            <CopyButton value={row.original.link} className="p-0.5" />
          </div>
        ),
      },
      {
        header: "Partners",
        size: 1,
        minSize: 1,
        cell: ({ row }) => nFormatter(row.original.totalPartners),
      },
      {
        header: "Conversions",
        size: 1,
        minSize: 1,
        cell: ({ row }) => nFormatter(row.original.totalConversions),
      },
      {
        header: "Revenue",
        size: 1,
        minSize: 1,
        cell: ({ row }) =>
          currencyFormatter(row.original.totalSaleAmount, {
            trailingZeroDisplay: "stripIfInteger",
          }),
      },
    ],
    onRowClick: (_row, e) => {
      if (e.metaKey || e.ctrlKey) window.open(referredPartnersUrl, "_blank");
      else router.push(referredPartnersUrl);
    },
    onRowAuxClick: () => window.open(referredPartnersUrl, "_blank"),
    rowProps: () => ({
      onPointerEnter: () => router.prefetch(referredPartnersUrl),
    }),
    resourceName: (p) => `link${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading: loadingReferral || loadingProgram,
    error:
      referralError || errorProgram
        ? "Failed to load partner referral data"
        : undefined,
  });

  if (!partner?.referralRewardId) {
    return null;
  }

  return (
    <>
      <h2 className="text-content-emphasis text-lg font-semibold">
        Partner referral link
      </h2>
      <Table {...table} />
    </>
  );
};
