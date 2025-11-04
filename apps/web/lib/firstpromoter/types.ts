import { z } from "zod";
import {
  firstPromoterCommissionSchema,
  firstPromoterCredentialsSchema,
  firstPromoterCustomerSchema,
  firstPromoterImportPayloadSchema,
  firstPromoterPartnerSchema,
} from "./schemas";

export type FirstPromoterCredentials = z.infer<
  typeof firstPromoterCredentialsSchema
>;

export type FirstPromoterImportPayload = z.infer<
  typeof firstPromoterImportPayloadSchema
>;

export type FirstPromoterPartner = z.infer<typeof firstPromoterPartnerSchema>;

export type FirstPromoterCustomer = z.infer<typeof firstPromoterCustomerSchema>;

export type FirstPromoterCommission = z.infer<
  typeof firstPromoterCommissionSchema
>;
