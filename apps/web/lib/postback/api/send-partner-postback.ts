import { prisma } from "@dub/prisma";
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

  await Promise.allSettled(
    adapters.map((adapter) =>
      adapter.execute({
        trigger,
        payload: enrichedData,
      }),
    ),
  );
};
