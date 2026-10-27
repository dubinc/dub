import { nullifyPostbackRevenue } from "@/lib/partners/hide-partner-revenue";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import { POSTBACK_EVENT_ID_PREFIX } from "@/lib/postback/constants";
import { prisma } from "@/lib/prisma";
import { PostbackTrigger } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { nanoid } from "@dub/utils";
import { PostbackCustomAdapter } from "./postback-adapter-custom";
import { PostbackSlackAdapter } from "./postback-adapter-slack";
import { postbackEventEnrichers } from "./postback-event-enrichers";

interface SendPartnerPostbackParams {
  partnerId: string;
  event: PostbackTrigger;
  data: Record<string, unknown>;
  skipEnrichment?: boolean; // Skip enrichment if the data is already enriched when sending a test event
  isTest?: boolean;
  programId?: string | null;
}

export const sendPartnerPostback = async ({
  partnerId,
  event,
  data,
  skipEnrichment = false,
  isTest = false,
  programId,
}: SendPartnerPostbackParams) => {
  const postbacks = await prisma.postback.findMany({
    where: {
      partnerId,
      ...(isTest
        ? {} // include disabled
        : { disabledAt: null }),
      triggers: {
        array_contains: [event],
      },
    },
  });

  if (postbacks.length === 0) {
    console.log(
      `[sendPartnerPostback] No postbacks found for partner ${partnerId} for the event ${event}.`,
    );
    return;
  }

  let enrichedData: Record<string, unknown>;

  try {
    enrichedData =
      !skipEnrichment && postbackEventEnrichers.has(event)
        ? postbackEventEnrichers.enrich(event, data)
        : data;
  } catch (error) {
    console.error("[sendPartnerPostback] Error enriching data", error);
    return;
  }

  if (
    programId &&
    (event === "sale.created" || event === "commission.created")
  ) {
    try {
      const visibleData = await applyPostbackRevenueVisibility({
        partnerId,
        programId,
        event,
        data: enrichedData,
      });

      if (!visibleData) {
        console.error(
          "[sendPartnerPostback] No program enrollment found for revenue visibility",
          { partnerId, programId, event },
        );
        return;
      }

      enrichedData = visibleData;
    } catch (error) {
      console.error("[sendPartnerPostback] Error applying revenue visibility", {
        partnerId,
        programId,
        event,
        error,
      });
      return;
    }
  }

  const adapters = postbacks.map((postback) => {
    switch (postback.receiver) {
      case "custom":
        return new PostbackCustomAdapter(postback);
      case "slack":
        return new PostbackSlackAdapter(postback);
      default:
        throw new Error(`Unknown postback receiver ${postback.receiver}`);
    }
  });

  await Promise.allSettled(
    adapters.map((adapter) =>
      adapter.execute({
        event,
        eventId: `${POSTBACK_EVENT_ID_PREFIX}${nanoid(25)}`,
        createdAt: new Date().toISOString(),
        data: enrichedData,
      }),
    ),
  );
};

/** Null sale dollar amounts on postback payloads when the partner group hides revenue. */
async function applyPostbackRevenueVisibility({
  partnerId,
  programId,
  event,
  data,
}: {
  partnerId: string;
  programId: string;
  event: "sale.created" | "commission.created";
  data: Record<string, unknown>;
}): Promise<Record<string, unknown> | null> {
  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      partnerGroup: {
        select: {
          revenueDataSharingDisabledAt: true,
        },
      },
      program: {
        select: {
          groups: {
            where: {
              slug: DEFAULT_PARTNER_GROUP.slug,
            },
            select: {
              revenueDataSharingDisabledAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  const group = enrollment.partnerGroup ?? enrollment.program.groups[0];

  if (!group) {
    return null;
  }

  if (!isPartnerRevenueHidden(group)) {
    return data;
  }

  return nullifyPostbackRevenue(event, data);
}
