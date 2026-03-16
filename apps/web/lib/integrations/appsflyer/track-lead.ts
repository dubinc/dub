import { trackLead } from "@/lib/api/conversions/track-lead";
import { WorkspaceProps } from "@/lib/types";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import * as z from "zod/v4";

const appsFlyerLeadEventSchema = z.object({
  clickId: z.string().min(1),
  event_name: z.string().min(1),
  customer_external_id: trackLeadRequestSchema.shape.customerExternalId,
  customer_name: trackLeadRequestSchema.shape.customerName,
  customer_email: trackLeadRequestSchema.shape.customerEmail,
  customer_avatar: trackLeadRequestSchema.shape.customerAvatar,
});

export const trackAppsFlyerLeadEvent = async ({
  queryParams,
  workspace,
}: {
  queryParams: Record<string, string>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
}) => {
  const {
    clickId,
    event_name: eventName,
    customer_external_id: customerExternalId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_avatar: customerAvatar,
  } = appsFlyerLeadEventSchema.parse(queryParams);

  return await trackLead({
    clickId,
    eventName,
    customerExternalId,
    customerName,
    customerEmail,
    customerAvatar,
    eventQuantity: undefined,
    mode: undefined,
    metadata: null,
    workspace,
    rawBody: queryParams,
  });
};
