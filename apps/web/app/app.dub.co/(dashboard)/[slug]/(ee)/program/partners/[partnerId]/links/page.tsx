"use client";

import { usePartnerReferral } from "@/lib/partner-referrals/hooks/use-partner-referral";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import usePartner from "@/lib/swr/use-partner";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import {
  CardList,
  CopyButton,
  InvoiceDollar,
  LoadingSpinner,
  Shuffle,
  Users,
} from "@dub/ui";
import { getPrettyUrl } from "@dub/utils";
import { useParams } from "next/navigation";
import { PartnerDiscountCodes } from "./discount-codes";
import {
  formatStatCount,
  formatStatRevenue,
  PartnerLinkStat,
  ReferralLinks,
} from "./referral-links";

export default function ProgramPartnerLinksPage() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <div className="grid min-w-0 grid-cols-1 gap-4">
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

  if (!partner?.referralRewardId) {
    return null;
  }

  const referralLink = constructPartnerReferralLink({
    partner,
    program,
  });

  // Stats count approved referred partners, matching the partners list these link to
  const referredPartnersUrl = (params?: Record<string, string>) =>
    `/${slug}/program/partners?${new URLSearchParams({
      status: "approved",
      referredByPartnerId: partner.id,
      ...params,
    })}`;

  return (
    <>
      <h2 className="text-content-emphasis text-lg font-semibold">
        Partner referral link
      </h2>
      {loadingReferral || loadingProgram ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : referralError || errorProgram || !referral?.stats ? (
        <div className="text-content-subtle rounded-xl border border-neutral-200 py-8 text-center text-sm">
          Failed to load partner referral data
        </div>
      ) : (
        <CardList variant="compact">
          <CardList.Card
            innerClassName="flex items-center justify-between gap-4 px-3 py-2.5"
            hoverStateEnabled={false}
          >
            <div className="flex min-w-0 items-center gap-1">
              <span className="text-content-default truncate text-sm font-medium">
                {getPrettyUrl(referralLink)}
              </span>
              <CopyButton
                value={referralLink}
                variant="neutral"
                className="shrink-0 p-1"
              />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <PartnerLinkStat
                icon={Users}
                iconClassName="data-[active=true]:text-blue-500"
                href={referredPartnersUrl()}
                {...formatStatCount({
                  count: referral.stats.totalPartners,
                  unit: "partner",
                })}
              />
              <PartnerLinkStat
                icon={Shuffle}
                iconClassName="data-[active=true]:text-orange-500"
                href={referredPartnersUrl({
                  totalConversionsMin: "1",
                  sortBy: "totalConversions",
                })}
                {...formatStatCount({
                  count: referral.stats.totalConversions,
                  unit: "conversion",
                })}
              />
              <PartnerLinkStat
                icon={InvoiceDollar}
                iconClassName="data-[active=true]:text-teal-500"
                href={referredPartnersUrl({
                  totalSaleAmountMin: "1",
                  sortBy: "totalSaleAmount",
                })}
                {...formatStatRevenue(referral.stats.totalSaleAmount)}
              />
            </div>
          </CardList.Card>
        </CardList>
      )}
    </>
  );
};
