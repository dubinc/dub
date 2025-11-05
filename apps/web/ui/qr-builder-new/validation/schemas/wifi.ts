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
}).refine(
  (data) => {
    // If encryption is not "none", password is required
    if (data.networkEncryption !== "none") {
      return data.networkPassword && data.networkPassword.length >= 8;
    }
    return true;
  },
  {
    message: "WiFi password must be at least 8 characters",
    path: ["networkPassword"],
  }
);

export type TWifiQRFormData = z.infer<typeof wifiQRSchema>;
