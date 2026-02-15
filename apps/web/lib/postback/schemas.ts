import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import * as z from "zod/v4";
import { clickEventSchema } from "../zod/schemas/clicks";
import { CommissionSchema } from "../zod/schemas/commissions";
import { CustomerEnrichedSchema } from "../zod/schemas/customers";
import { LinkSchema } from "../zod/schemas/links";
import { POSTBACK_TRIGGERS } from "./constants";

export const partnerPostbackSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
  disabledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createPartnerPostbackInputSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(40, "Name must be less than 40 characters"),
  url: parseUrlSchema.refine((u) => u.startsWith("https://"), {
    message: "URL must use HTTPS",
  }),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
});

export const createPartnerPostbackOutputSchema = z.object({
  ...partnerPostbackSchema.shape,
  secret: z.string(),
});

export const updatePartnerPostbackInputSchema = createPartnerPostbackInputSchema
  .partial()
  .extend({
    disabled: z.boolean().optional(),
  });

export const sendTestPartnerPostbackInputSchema = z.object({
  event: z.enum(POSTBACK_TRIGGERS),
});

export const leadEventPostbackSchema = z.object({
  eventName: z.string(),
  click: clickEventSchema,
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    domain: true,
    key: true,
  }),
  customer: CustomerEnrichedSchema.pick({
    id: true,
    country: true,
    createdAt: true,
    firstSaleAt: true,
    subscriptionCanceledAt: true,
  }),
});

export const saleEventPostbackSchema = z.object({
  eventName: z.string(),
  click: clickEventSchema,
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    domain: true,
    key: true,
  }),
  customer: CustomerEnrichedSchema.pick({
    id: true,
    country: true,
    createdAt: true,
    firstSaleAt: true,
    subscriptionCanceledAt: true,
  }),
  sale: z.object({
    amount: z.number(),
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
  customer: CustomerEnrichedSchema.pick({
    id: true,
    country: true,
    createdAt: true,
    firstSaleAt: true,
    subscriptionCanceledAt: true,
  }).nullable(),
});

export const postbackEventSchemaTB = z.object({
  event_id: z.string(),
  postback_id: z.string(),
  message_id: z.string(),
  event: z.enum(POSTBACK_TRIGGERS),
  url: z.string(),
  response_status: z.number(),
  response_body: z.string(),
  request_body: z.string(),
  timestamp: z.string(),
});
