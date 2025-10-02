import { z } from "zod";
import {
  qrNameSchema,
  wifiNetworkNameSchema,
  wifiPasswordSchema,
} from "./base";

export const wifiQRSchema = qrNameSchema.extend({
  networkName: wifiNetworkNameSchema,
  networkPassword: wifiPasswordSchema,
  networkEncryption: z.enum(["WPA", "WEP", "none"], {
    required_error: "Please select a security type",
  }),
  isHiddenNetwork: z.boolean().optional(),
});

export type TWifiQRFormData = z.infer<typeof wifiQRSchema>;
