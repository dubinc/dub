import { z } from "zod";
import {
  partnerStackAffiliate,
  partnerStackImportPayloadSchema,
  partnerStackLink,
} from "./schemas";

export interface PartnerStackConfig {
  token: string;
}

export interface PartnerStackListResponse<T> {
  data: {
    items: T[];
  };
}

export type PartnerStackImportPayload = z.infer<
  typeof partnerStackImportPayloadSchema
>;

export type PartnerStackAffiliate = z.infer<typeof partnerStackAffiliate>;

export type PartnerStackLink = z.infer<typeof partnerStackLink>;
