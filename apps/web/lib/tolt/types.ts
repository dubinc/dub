import { z } from "zod";
import {
  ToltAffiliateSchema,
  ToltCommissionSchema,
  ToltCustomerSchema,
  ToltLinkSchema,
  ToltProgramSchema,
} from "./schemas";

export interface ToltConfig {
  token: string;
  userId: string;
  toltProgramId: string;
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
