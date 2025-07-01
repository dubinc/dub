import { z } from "zod";
import {
  ToltAffiliateSchema,
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
  has_more: boolean;
  total_count: number;
  data: T[];
}

export interface ToltProgram extends z.infer<typeof ToltProgramSchema> {
  total_affiliates: number;
}

export interface ToltAffiliate extends z.infer<typeof ToltAffiliateSchema> {
  //
}

export interface ToltLink extends z.infer<typeof ToltLinkSchema> {
  //
}

export interface ToltCustomer extends z.infer<typeof ToltCustomerSchema> {
  //
}
