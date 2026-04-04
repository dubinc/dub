import { POSTBACK_EVENT_ID_PREFIX } from "@/lib/postback/constants";
import { PostbackTrigger } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { PostbackCustomAdapter } from "./postback-adapter-custom";
import { PostbackSlackAdapter } from "./postback-adapter-slack";
import { postbackEventEnrichers } from "./postback-event-enrichers";

interface SendPartnerPostbackParams {
  partnerId: string;
  programId?: string;
  event: PostbackTrigger;
  data: Record<string, unknown>;
  skipEnrichment?: boolean; // Skip enrichment if the data is already enriched when sending a test event
  isTest?: boolean;
}

export const sendPartnerPostback = async ({
  partnerId,
  programId,
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

  // Find the program enrollment
  let programEnrollment:
    | Pick<ProgramEnrollment, "customerDataSharingEnabledAt">
    | undefined;

  if (programId) {
    const result = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        customerDataSharingEnabledAt: true,
      },
    });

    if (!result) {
      console.warn(
        `[sendPartnerPostback] Program enrollment not found for partner ${partnerId} and program ${programId}.`,
      );
      return;
    }

    programEnrollment = result;
  }

  let enrichedData: Record<string, unknown> | undefined;

  try {
    if (!skipEnrichment && postbackEventEnrichers.has(event)) {
      const context = {
        customerDataSharingEnabledAt:
          programEnrollment?.customerDataSharingEnabledAt,
      };

      enrichedData = postbackEventEnrichers.enrich(event, data, context);
    } else {
      enrichedData = data;
    }
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
