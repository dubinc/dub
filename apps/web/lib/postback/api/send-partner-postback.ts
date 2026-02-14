import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import { PostbackTrigger } from "../constants";
import { PostbackCustomAdapter } from "./postback-adapters";

interface SendPartnerPostbackParams {
  partner: Pick<Partner, "id">;
  event: PostbackTrigger;
  data: unknown;
}

export const sendPartnerPostback = async ({
  partner,
  event,
  data,
}: SendPartnerPostbackParams) => {
  const postbacks = await prisma.partnerPostback.findMany({
    where: {
      partnerId: partner.id,
      disabledAt: null,
      triggers: {
        array_contains: [event],
      },
    },
  });

  if (postbacks.length === 0) {
    console.log(
      `[sendPartnerPostback] No postbacks found for partner ${partner.id} for the event ${event}.`,
    );
    return;
  }

  // const basePayload: PostbackBasePayload = {
  //   id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
  //   event,
  //   createdAt: new Date().toISOString(),
  //   data,
  // };

  const adapters = postbacks.map((postback) => {
    switch (postback.destination) {
      case "custom":
        return new PostbackCustomAdapter();
      default:
        throw new Error(
          `Unsupported postback destination ${postback.destination}`,
        );
    }
  });

  // Send to all destinations in parallel
  await Promise.allSettled(
    adapters.map((adapter) => {
      adapter.execute(event, data);
    }),
  );
};
