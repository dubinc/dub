import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import type { PartnerProps } from "@/lib/types";
import { COUNTRIES } from "@dub/utils";
import { PartnerPayoutMethod } from "@prisma/client";

export function getConnectPayoutDisabledTooltip({
  partner,
  availablePayoutMethods,
}: {
  partner?: Pick<PartnerProps, "networkStatus" | "role" | "country"> | null;
  availablePayoutMethods: PartnerPayoutMethod[];
}) {
  if (!partner) {
    return undefined;
  }

  if (partner.networkStatus === "banned") {
    return {
      title:
        "Your account is banned and is not eligible to connect a payout method.",
    };
  }

  if (!hasPermission(partner.role, "payout_settings.update")) {
    return {
      title:
        "You don't have permission to connect a payout method. Please contact your [partner team owner](/profile/members).",
    };
  }

  if (!partner.country) {
    return {
      title:
        "You haven't set your country yet. Please update your country or contact support.",
      cta: "Update profile settings",
      href: "/profile",
    };
  }

  if (availablePayoutMethods.length === 0) {
    return {
      title: `Your current country (${COUNTRIES[partner.country]}) is not supported for payout. Please update your country or contact support.`,
      cta: "Update profile settings",
      href: "/profile",
    };
  }

  return undefined;
}
