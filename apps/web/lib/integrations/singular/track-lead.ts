import { trackLead } from "@/lib/api/conversions/track-lead";
import { WorkspaceProps } from "@/lib/types";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import * as z from "zod/v4";

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

export const trackSingularLeadEvent = async ({
  queryParams,
  workspace,
}: {
  queryParams: Record<string, string>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
}) => {
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
  } = singularLeadEventSchema.parse(queryParams);

  return await trackLead({
    clickId,
    eventName,
    customerEmail,
    customerAvatar,
    customerExternalId,
    customerName,
    eventQuantity,
    mode,
    metadata: null,
    workspace,
    rawBody: queryParams,
  });
};
