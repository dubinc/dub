import * as z from "zod/v4";
import {
  partnerStackCommission,
  partnerStackCredentialsSchema,
  partnerStackCustomer,
  partnerStackGroup,
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

export type PartnerStackGroup = z.infer<typeof partnerStackGroup>;

export type PartnerStackPartner = z.infer<typeof partnerStackPartner>;

export type PartnerStackLink = z.infer<typeof partnerStackLink>;

export type PartnerStackCustomer = z.infer<typeof partnerStackCustomer>;

export type PartnerStackCommission = z.infer<typeof partnerStackCommission>;

export type PartnerStackCredentials = z.infer<
  typeof partnerStackCredentialsSchema
>;
