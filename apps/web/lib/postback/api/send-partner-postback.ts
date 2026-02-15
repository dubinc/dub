import { WEBHOOK_EVENT_ID_PREFIX } from "@/lib/webhook/constants";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { PostbackTrigger } from "../constants";
import { PostbackCustomAdapter } from "./postback-adapters";
import { postbackEventEnrichers } from "./postback-event-enrichers";

interface SendPartnerPostbackParams {
  partnerId: string;
  trigger: PostbackTrigger;
  data: Record<string, unknown>;
}

export const sendPartnerPostback = async ({
  partnerId,
  trigger,
  data,
}: SendPartnerPostbackParams) => {
  const postbacks = await prisma.partnerPostback.findMany({
    where: {
      partnerId,
      disabledAt: null,
      triggers: {
        array_contains: [trigger],
      },
    },
  });

  if (postbacks.length === 0) {
    console.log(
      `[sendPartnerPostback] No postbacks found for partner ${partnerId} for the trigger ${trigger}.`,
    );
    return;
  }

  const enrichedData = postbackEventEnrichers.has(trigger)
    ? postbackEventEnrichers.enrich(trigger, data)
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
        trigger,
        eventId,
        createdAt,
        data: enrichedData,
      }),
    ),
  );
};
