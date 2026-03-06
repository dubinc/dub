import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import { PostbackReceiver } from "@dub/prisma/client";
import * as z from "zod/v4";
import { clickEventSchema } from "../zod/schemas/clicks";
import { CommissionSchema } from "../zod/schemas/commissions";
import { CustomerEnrichedSchema } from "../zod/schemas/customers";
import { LinkSchema } from "../zod/schemas/links";
import { POSTBACK_TRIGGERS } from "./constants";

export const postbackSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
  receiver: z.enum(PostbackReceiver),
  disabledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createPostbackInputSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(40, "Name must be less than 40 characters"),
  url: parseUrlSchema.refine((u) => u.startsWith("https://"), {
    message: "URL must use HTTPS",
  }),
  triggers: z
    .array(z.enum(POSTBACK_TRIGGERS))
    .min(1, "At least one trigger is required"),
});

export const createPostbackOutputSchema = z.object({
  ...postbackSchema.shape,
  secret: z.string(),
});

export const updatePostbackInputSchema = createPostbackInputSchema
  .partial()
  .extend({
    disabled: z.boolean().optional(),
  });

export const sendTestPostbackInputSchema = z.object({
  event: z.enum(POSTBACK_TRIGGERS),
});

// Postback event schemas
const postbackLinkSchema = LinkSchema.pick({
  id: true,
  shortLink: true,
  domain: true,
  key: true,
});

const postbackCustomerSchema = CustomerEnrichedSchema.pick({
  id: true,
  email: true,
  country: true,
  createdAt: true,
  firstSaleAt: true,
  subscriptionCanceledAt: true,
});

export const leadEventPostbackSchema = z.object({
  eventName: z.string(),
  click: clickEventSchema,
  link: postbackLinkSchema,
  customer: postbackCustomerSchema,
});

export const saleEventPostbackSchema = z.object({
  eventName: z.string(),
  click: clickEventSchema,
  link: postbackLinkSchema,
  customer: postbackCustomerSchema,
  sale: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
});

export const commissionEventPostbackSchema = CommissionSchema.pick({
  id: true,
  type: true,
  amount: true,
  earnings: true,
  currency: true,
  status: true,
  description: true,
  quantity: true,
  createdAt: true,
}).extend({
  link: postbackLinkSchema.nullable(),
  customer: postbackCustomerSchema.nullable(),
});

export const postbackCallbackParamsSchema = z.object({
  postbackId: z.string(),
  eventId: z.string(),
  event: z.enum(POSTBACK_TRIGGERS),
});

export const postbackCallbackBodySchema = z.object({
  status: z.number(),
  url: z.string(),
  sourceMessageId: z.string(),
  body: z.string().optional().default(""),
  sourceBody: z.string(),
  retried: z.number().optional().default(0),
});

export const postbackEventInputSchemaTB = z.object({
  postback_id: z.string(),
  event_id: z.string(),
  message_id: z.string(),
  event: z.enum(POSTBACK_TRIGGERS),
  url: z.url(),
  response_status: z.number(),
  response_body: z.string(),
  request_body: z.string(),
  timestamp: z.string(),
  retry_attempt: z.number(),
});

export const postbackEventOutputSchemaTB = postbackEventInputSchemaTB.omit({
  postback_id: true,
  message_id: true,
});
