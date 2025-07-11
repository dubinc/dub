import { includeTags } from "@/lib/api/links/include-tags";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { ClickEventTB } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";

export const trackSingularLeadEvent = async ({
  clickData,
  link,
}: {
  clickData: ClickEventTB;
  link: Link;
}) => {
  const eventQuantity = 1;
  const eventId = nanoid(16);
  const body = {};
  const customer = {
    id: "xxx",
  };

  // TODO:
  // Record lead
  // Send "lead.created" webhook

  await Promise.allSettled([
    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        leads: {
          increment: eventQuantity,
        },
      },
      include: includeTags,
    }),

    prisma.project.update({
      where: {
        id: link.projectId!,
      },
      data: {
        usage: {
          increment: eventQuantity,
        },
      },
    }),

    logConversionEvent({
      workspace_id: link.projectId!,
      link_id: link.id,
      path: "/track/lead",
      body: JSON.stringify(body),
    }),
  ]);

  if (link.programId && link.partnerId && customer) {
    await createPartnerCommission({
      event: "lead",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId,
      customerId: customer.id,
      quantity: eventQuantity,
    });
  }
};
