import { z } from "zod";
import {
  partnerStackAffiliate,
  partnerStackImportPayloadSchema,
} from "./schemas";

export interface PartnerStackConfig {
  token: string;
}

export interface PartnerStackListResponse<T> {
  data: {
    items: T[];
  };
}

export type PartnerStackAffiliate = z.infer<typeof partnerStackAffiliate>;

export type PartnerStackImportPayload = z.infer<
  typeof partnerStackImportPayloadSchema
>;
