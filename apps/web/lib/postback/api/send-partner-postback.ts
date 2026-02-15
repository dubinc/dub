import { WEBHOOK_EVENT_ID_PREFIX } from "@/lib/webhook/constants";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { PostbackTrigger } from "../constants";
import { PostbackCustomAdapter } from "./postback-adapters";
import { postbackEventEnrichers } from "./postback-event-enrichers";

interface SendPartnerPostbackParams {
  partnerId: string;
  event: PostbackTrigger;
  data: Record<string, unknown>;
}

export const sendPartnerPostback = async ({
  partnerId,
  event,
  data,
}: SendPartnerPostbackParams) => {
  const postbacks = await prisma.partnerPostback.findMany({
    where: {
      partnerId,
      disabledAt: null,
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

  const enrichedData = postbackEventEnrichers.has(event)
    ? postbackEventEnrichers.enrich(event, data)
    : data;

  const adapters = postbacks.map((postback) => {
    switch (postback.destination) {
      case "custom":
        return new PostbackCustomAdapter(postback);
      default:
        throw new Error(
          `Unsupported postback destination ${postback.destination}`,
        );
    }
  });

  const eventId = `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`;
  const createdAt = new Date().toISOString();

  await Promise.allSettled(
    adapters.map((adapter) =>
      adapter.execute({
        event,
        eventId,
        createdAt,
        data: enrichedData,
      }),
    ),
  );
};
