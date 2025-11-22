import { currencyFormatter } from "@dub/utils";
import { LARGE_PROGRAM_IDS } from "../constants/program";
import { EnrolledPartnerProps, PartnerProps } from "../types";
import {
  ONLINE_PRESENCE_FIELDS,
  PartnerOnlinePresenceFields,
} from "./online-presence";

const PARTNER_DISCOVERY_MIN_COMMISSIONS = 10_00;

const partnerHasEarnedCommissions = (
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[],
) => {
  return (
    programEnrollments.filter(
      (pe) =>
        !LARGE_PROGRAM_IDS.includes(pe.programId) &&
        pe.status === "approved" &&
        pe.totalCommissions >= PARTNER_DISCOVERY_MIN_COMMISSIONS,
    ).length >= 1
  );
};

const partnerIsNotBanned = (
  programEnrollments: Pick<EnrolledPartnerProps, "programId" | "status">[],
) => {
  return programEnrollments.every((pe) => pe.status !== "banned");
};

export const partnerCanViewMarketplace = (
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[],
) => {
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
    | PartnerOnlinePresenceFields
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
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
      completed: ONLINE_PRESENCE_FIELDS.some(
        (field) => field.data(partner).value, // TODO: update this to also check for "verified" in the future
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
      label: `Earn ${currencyFormatter(PARTNER_DISCOVERY_MIN_COMMISSIONS, { trailingZeroDisplay: "stripIfInteger" })} in commissions`,
      completed: partnerHasEarnedCommissions(programEnrollments),
    },
    {
      label: "Maintain a healthy partner profile",
      completed: partnerIsNotBanned(programEnrollments),
    },
  ];
}
