import { z } from "zod";
import {
  partnerStackPartner,
  partnerStackCommission,
  partnerStackCustomer,
  partnerStackImportPayloadSchema,
  partnerStackLink,
} from "./schemas";

export interface PartnerStackConfig {
  publicKey: string;
  secretKey: string;
}

export interface PartnerStackListResponse<T> {
  data: {
    items: T[];
  };
}

export type PartnerStackImportPayload = z.infer<
  typeof partnerStackImportPayloadSchema
>;

export type PartnerStackPartner = z.infer<typeof partnerStackPartner>;

export type PartnerStackLink = z.infer<typeof partnerStackLink>;

export type PartnerStackCustomer = z.infer<typeof partnerStackCustomer>;

export type PartnerStackCommission = z.infer<typeof partnerStackCommission>;
