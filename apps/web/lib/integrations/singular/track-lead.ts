import { trackLead } from "@/lib/api/conversions/track-lead";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { z } from "zod";

const singularLeadEventSchema = z.object({
  dub_id: z.string().min(1),
  event_name: z.string().min(1),
  event_attributes: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        throw new Error("Invalid JSON in event_attributes");
      }
    })
    .pipe(
      z.object({
        customer_external_id: trackLeadRequestSchema.shape.customerExternalId,
        customer_name: trackLeadRequestSchema.shape.customerName,
        customer_email: trackLeadRequestSchema.shape.customerEmail,
        customer_avatar: trackLeadRequestSchema.shape.customerAvatar,
        event_quantity: trackLeadRequestSchema.shape.eventQuantity,
        mode: trackLeadRequestSchema.shape.mode,
      }),
    ),
});

export const trackSingularLeadEvent = async (
  searchParams: Record<string, string>,
) => {
  console.log("[Singular] Lead event received", searchParams);

  const {
    dub_id: clickId,
    event_name: eventName,
    event_attributes: {
      customer_external_id: customerExternalId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_avatar: customerAvatar,
      event_quantity: eventQuantity,
      mode,
    },
  } = singularLeadEventSchema.parse(searchParams);

  // TODO: Fix this
  const workspaceId = "clrei1gld0002vs9mzn93p8ik";

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      webhookEnabled: true,
    },
  });

  return await trackLead({
    clickId,
    eventName,
    customerEmail,
    customerAvatar,
    customerExternalId,
    customerName,
    eventQuantity,
    mode,
    workspace,
    rawBody: searchParams,
    metadata: null,
  });
};
