import { z } from "zod";
import {
  partnerStackCommission,
  partnerStackCredentialsSchema,
  partnerStackCustomer,
  partnerStackImportPayloadSchema,
  partnerStackLink,
  partnerStackPartner,
} from "./schemas";

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

export type PartnerStackCredentials = z.infer<
  typeof partnerStackCredentialsSchema
>;
