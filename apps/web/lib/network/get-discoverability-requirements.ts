import { currencyFormatter } from "@dub/utils";
import {
  EXCLUDED_PROGRAM_IDS,
  PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
} from "../constants/partner-profile";
import { PARTNER_PLATFORM_FIELDS } from "../partners/partner-platforms";
import { EnrolledPartnerProps, PartnerProps } from "../types";

export const partnerHasEarnedCommissions = (
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[],
) => {
  return (
    programEnrollments.filter(
      (pe) =>
        !EXCLUDED_PROGRAM_IDS.includes(pe.programId) &&
        pe.status === "approved" &&
        pe.totalCommissions >= PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
    ).length >= 1
  );
};

const partnerIsNotBanned = (
  programEnrollments: Pick<EnrolledPartnerProps, "programId" | "status">[],
) => {
  return programEnrollments.every((pe) => pe.status !== "banned");
};

export const partnerCanViewMarketplace = ({
  partner,
  programEnrollments,
}: {
  partner?: Pick<PartnerProps, "email">;
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[];
}) => {
  if (partner?.email?.endsWith("@dub.co")) {
    return true;
  }
  return (
    partnerHasEarnedCommissions(programEnrollments) &&
    partnerIsNotBanned(programEnrollments)
  );
};

export function getDiscoverabilityRequirements({
  partner,
  programEnrollments,
}: {
  partner: Pick<
    PartnerProps,
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "platforms"
  >;
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[];
}) {
  return [
    {
      label: "Add basic profile info",
      completed: true,
    },
    {
      label: "Connect your website or social account",
      href: "#sites",
      completed: PARTNER_PLATFORM_FIELDS.some(
        (field) => field.data(partner.platforms).value, // TODO: update this to also check for "verified" in the future
      ),
    },
    {
      label: "Update your profile description",
      href: "#about",
      completed: !!partner.description,
    },
    {
      label: "Specify your estimated monthly traffic",
      href: "#traffic",
      completed: !!partner.monthlyTraffic,
    },
    {
      label: "Select your preferred earning structures",
      href: "#earning-structures",
      completed: Boolean(partner.preferredEarningStructures?.length),
    },
    {
      label: "Choose your sales channels",
      href: "#channels",
      completed: Boolean(partner.salesChannels?.length),
    },
    {
      label: "Maintain a healthy partner profile",
      completed: partnerIsNotBanned(programEnrollments),
    },
    {
      label: `Earn ${currencyFormatter(PARTNER_NETWORK_MIN_COMMISSIONS_CENTS, { trailingZeroDisplay: "stripIfInteger" })} in commissions`,
      completed: partnerHasEarnedCommissions(programEnrollments),
    },
  ];
}
