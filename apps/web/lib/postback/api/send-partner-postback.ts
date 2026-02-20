import { POSTBACK_EVENT_ID_PREFIX } from "@/lib/postback/constants";
import { PostbackTrigger } from "@/lib/types";
import { prisma } from "@dub/prisma";
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
}

export const sendPartnerPostback = async ({
  partnerId,
  event,
  data,
  skipEnrichment = false,
  isTest = false,
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

  let enrichedData: Record<string, unknown> | undefined;

  try {
    enrichedData =
      !skipEnrichment && postbackEventEnrichers.has(event)
        ? postbackEventEnrichers.enrich(event, data)
        : data;
  } catch (error) {
    console.error("[sendPartnerPostback] Error enriching data", error);
    return;
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
