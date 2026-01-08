import * as z from "zod/v4";
import {
  ToltAffiliateSchema,
  ToltCommissionSchema,
  ToltCustomerSchema,
  toltImportPayloadSchema,
  ToltLinkSchema,
  ToltProgramSchema,
} from "./schemas";

export interface ToltCredentials {
  token: string;
}

export interface ToltListResponse<T> {
  success: true;
  total_count: number;
  data: T[];
}

export interface ToltProgram extends z.infer<typeof ToltProgramSchema> {
  affiliates: number;
}

export type ToltAffiliate = z.infer<typeof ToltAffiliateSchema>;

export type ToltLink = z.infer<typeof ToltLinkSchema>;

export type ToltCustomer = z.infer<typeof ToltCustomerSchema>;

export type ToltCommission = z.infer<typeof ToltCommissionSchema>;

export type ToltImportPayload = z.infer<typeof toltImportPayloadSchema>;
