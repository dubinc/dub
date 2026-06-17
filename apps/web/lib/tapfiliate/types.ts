import * as z from "zod/v4";
import {
  tapfiliateCommissionSchema,
  tapfiliateConversionSchema,
  tapfiliateCustomerSchema,
  tapfiliateImportPayloadSchema,
  tapfiliatePartnerSchema,
  tapfiliateProgramSchema,
} from "./schemas";

export interface TapfiliateCredentials {
  apiKey: string;
}

export type TapfiliateProgram = z.infer<typeof tapfiliateProgramSchema>;

export type TapfiliatePartner = z.infer<typeof tapfiliatePartnerSchema>;

export type TapfiliateCustomer = z.infer<typeof tapfiliateCustomerSchema>;

export type TapfiliateCommission = z.infer<typeof tapfiliateCommissionSchema>;

export type TapfiliateConversion = z.infer<typeof tapfiliateConversionSchema>;

export type TapfiliateImportPayload = z.infer<
  typeof tapfiliateImportPayloadSchema
>;
