import * as z from "zod/v4";
import {
  tapfiliateCommissionSchema,
  tapfiliateConversionSchema,
  tapfiliateCustomerSchema,
  tapfiliateGroupSchema,
  tapfiliateImportPayloadSchema,
  tapfiliatePartnerSchema,
  tapfiliateProgramSchema,
} from "./schemas";

export interface TapfiliateCredentials {
  apiKey: string;
}

export type TapfiliateImportPayload = z.infer<
  typeof tapfiliateImportPayloadSchema
>;

export type TapfiliateProgram = z.infer<typeof tapfiliateProgramSchema>;

export type TapfiliateGroup = z.infer<typeof tapfiliateGroupSchema>;

export type TapfiliatePartner = z.infer<typeof tapfiliatePartnerSchema>;

export type TapfiliateCustomer = z.infer<typeof tapfiliateCustomerSchema>;

type TapfiliateCommission = z.infer<typeof tapfiliateCommissionSchema>;

export type TapfiliateConversion = z.infer<typeof tapfiliateConversionSchema>;

export type TapfiliateConversionWithCommission = Omit<
  TapfiliateConversion,
  "commissions"
> & {
  commission: TapfiliateCommission;
};
