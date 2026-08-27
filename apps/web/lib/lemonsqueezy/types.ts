import * as z from "zod/v4";
import {
  lemonSqueezyAffiliateSchema,
  lemonSqueezyCustomerSchema,
  lemonSqueezyImportPayloadSchema,
  lemonSqueezyJsonApiResourceSchema,
  lemonSqueezyOrderSchema,
  lemonSqueezyStoreSchema,
  lemonSqueezySubscriptionInvoiceSchema,
} from "./schemas";

export interface LemonSqueezyCredentials {
  apiKey: string;
}

export type LemonSqueezyImportPayload = z.infer<
  typeof lemonSqueezyImportPayloadSchema
>;

export type LemonSqueezyJsonApiResource = z.infer<
  typeof lemonSqueezyJsonApiResourceSchema
>;

export type LemonSqueezyStore = z.infer<typeof lemonSqueezyStoreSchema>;

export type LemonSqueezyAffiliate = z.infer<typeof lemonSqueezyAffiliateSchema>;

export type LemonSqueezyCustomer = z.infer<typeof lemonSqueezyCustomerSchema>;

export type LemonSqueezyOrder = z.infer<typeof lemonSqueezyOrderSchema>;

export type LemonSqueezySubscriptionInvoice = z.infer<
  typeof lemonSqueezySubscriptionInvoiceSchema
>;
