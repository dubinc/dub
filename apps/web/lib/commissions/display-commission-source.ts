import { WEBHOOK_REQUEST_ACTORS_BY_PATH } from "@/lib/api-logs/constants";
import { PROGRAM_IMPORT_SOURCES } from "@/lib/constants/program";
import { DUB_LOGO_SQUARE } from "@dub/utils";
import { CommissionSource, CommissionStatus } from "@prisma/client";

const COMMISSION_SOURCE_DISPLAY = {
  api: { action: "tracked by", name: "API", image: DUB_LOGO_SQUARE },
  user: {
    action: "created by",
    name: "user",
    image: "https://api.dub.co/og/avatar",
  },
  stripe: {
    action: "tracked by",
    name: "Stripe",
    image: WEBHOOK_REQUEST_ACTORS_BY_PATH["/stripe/integration/webhook"].image,
  },
  shopify: {
    action: "tracked by",
    name: "Shopify",
    image: WEBHOOK_REQUEST_ACTORS_BY_PATH["/shopify/integration/webhook"].image,
  },
  hubspot: {
    action: "tracked by",
    name: "HubSpot",
    image: WEBHOOK_REQUEST_ACTORS_BY_PATH["/hubspot/webhook"].image,
  },
  appsflyer: {
    action: "tracked by",
    name: "AppsFlyer",
    image: WEBHOOK_REQUEST_ACTORS_BY_PATH["/appsflyer/webhook"].image,
  },
  singular: {
    action: "tracked by",
    name: "Singular",
    image: WEBHOOK_REQUEST_ACTORS_BY_PATH["/singular/webhook"].image,
  },
  rewardful: {
    action: "imported from",
    name: PROGRAM_IMPORT_SOURCES.rewardful.value,
    image: PROGRAM_IMPORT_SOURCES.rewardful.image,
  },
  partnerstack: {
    action: "imported from",
    name: "PartnerStack",
    image: PROGRAM_IMPORT_SOURCES.partnerstack.image,
  },
  firstpromoter: {
    action: "imported from",
    name: "FirstPromoter",
    image: PROGRAM_IMPORT_SOURCES.firstpromoter.image,
  },
  tolt: {
    action: "imported from",
    name: "Tolt",
    image: PROGRAM_IMPORT_SOURCES.tolt.image,
  },
  tapfiliate: {
    action: "imported from",
    name: "Tapfiliate",
    image: PROGRAM_IMPORT_SOURCES.tapfiliate.image,
  },
  lemonsqueezy: {
    action: "imported from",
    name: "Lemon Squeezy",
    image: PROGRAM_IMPORT_SOURCES.lemonsqueezy.image,
  },
  affiliatewp: {
    action: "imported from",
    name: "AffiliateWP",
    image: "https://assets.dub.co/misc/icons/affiliatewp.svg",
  },
} as const satisfies Record<
  CommissionSource,
  {
    action: "tracked by" | "imported from" | "created by";
    name: string;
    image: string;
  }
>;

export function getCommissionSourceDisplay(
  source: CommissionSource | null | undefined,
) {
  if (!source) return null;

  const { action, name, image } = COMMISSION_SOURCE_DISPLAY[source];

  return {
    source,
    action,
    name,
    image,
    phrase: `${action} ${name}`,
  };
}

export function getCommissionCreatedActivity({
  source,
  status,
  hasActivityLogs,
  hasUser = false,
}: {
  source: CommissionSource | null | undefined;
  status: CommissionStatus;
  hasActivityLogs: boolean;
  hasUser?: boolean;
}): {
  lead: string;
  status: CommissionStatus;
  showUser: boolean;
} {
  const createdStatus =
    status !== "pending" && !hasActivityLogs ? status : "pending";

  const display = getCommissionSourceDisplay(source);

  if (display) {
    return {
      lead: `Commission ${display.action}`,
      status: createdStatus,
      showUser: display.source === "user" && hasUser,
    };
  }

  return {
    lead: createdStatus === "pending" ? "Commission" : "Commission imported as",
    status: createdStatus,
    showUser: false,
  };
}
