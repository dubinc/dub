import { PartnerProps } from "../types";
import {
  ONLINE_PRESENCE_FIELDS,
  PartnerOnlinePresenceFields,
} from "./online-presence";

export const PARTNER_DISCOVERY_MIN_COMMISSIONS = 100_00;

export function getPartnerDiscoveryRequirements({
  partner,
  totalCommissions,
}: {
  partner: Pick<
    PartnerProps,
    | PartnerOnlinePresenceFields
    | "description"
    | "industryInterests"
    | "salesChannels"
  >;
  totalCommissions: number;
}) {
  return [
    {
      label: "Add basic profile info",
      completed: true,
    },
    {
      label: "Verify your website or social account",
      href: "#sites",
      completed: ONLINE_PRESENCE_FIELDS.some(
        (field) => field.data(partner).verified,
      ),
    },
    {
      label: "Write your bio",
      href: "#about",
      completed: !!partner.description,
    },
    {
      label: "Select your industry interests",
      href: "#interests",
      completed: Boolean(partner.industryInterests?.length),
    },
    {
      label: "Choose your sales channels",
      href: "#channels",
      completed: Boolean(partner.salesChannels?.length),
    },
    {
      label: "Earn $100 in commissions",
      completed: totalCommissions >= PARTNER_DISCOVERY_MIN_COMMISSIONS,
    },
  ];
}
