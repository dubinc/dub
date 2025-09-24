import { z } from "zod";
import {
  hubSpotAuthTokenSchema,
  hubSpotContactSchema,
  hubSpotRefreshTokenSchema,
} from "./schema";

export type HubSpotAuthToken = z.infer<typeof hubSpotAuthTokenSchema>;

export type HubSpotRefreshToken = z.infer<typeof hubSpotRefreshTokenSchema>;

export type HubSpotContact = z.infer<typeof hubSpotContactSchema>;
