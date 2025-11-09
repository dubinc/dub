import { ACME_PROGRAM_ID, currencyFormatter } from "@dub/utils";
import { EnrolledPartnerProps, PartnerProps } from "../types";
import {
  ONLINE_PRESENCE_FIELDS,
  PartnerOnlinePresenceFields,
} from "./online-presence";

export const PARTNER_DISCOVERY_MIN_COMMISSIONS = 100_00;

export function getPartnerDiscoveryRequirements({
  partner,
  programEnrollments,
}: {
  partner: Pick<
    PartnerProps,
    | PartnerOnlinePresenceFields
    | "description"
    | "salesChannels"
    | "monthlyTraffic"
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
      label: "Choose your sales channels",
      href: "#channels",
      completed: Boolean(partner.salesChannels?.length),
    },
    {
      label: `Earn ${currencyFormatter(PARTNER_DISCOVERY_MIN_COMMISSIONS / 100, { trailingZeroDisplay: "stripIfInteger" })} in commissions from at least 2 programs`,
      completed:
        programEnrollments.filter(
          (pe) =>
            pe.programId !== ACME_PROGRAM_ID &&
            pe.status === "approved" &&
            pe.totalCommissions >= PARTNER_DISCOVERY_MIN_COMMISSIONS,
        ).length >= 2,
    },
  ];
}
