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

export const partnerIsNotBanned = (
  programEnrollments: Pick<EnrolledPartnerProps, "programId" | "status">[],
) => {
  return programEnrollments.every((pe) => pe.status !== "banned");
};

export function getDiscoverabilityRequirements({
  partner,
}: {
  partner: Pick<
    PartnerProps,
    | "image"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "platforms"
  >;
}) {
  return [
    {
      label: "Upload your logo",
      href: "#info",
      completed: !!partner.image,
    },
    {
      label: "Verify at least 2 social accounts/website",
      href: "#platforms",
      completed:
        PARTNER_PLATFORM_FIELDS.filter(
          (field) => field.data(partner.platforms).verified,
        ).length >= 2,
    },
    {
      label: "Fill out your profile description",
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
  ];
}
