import { z } from "zod";
import { hubSpotAuthTokenSchema, hubSpotRefreshTokenSchema } from "./schema";

export type HubSpotAuthToken = z.infer<typeof hubSpotAuthTokenSchema>;

export type HubSpotRefreshToken = z.infer<typeof hubSpotRefreshTokenSchema>;
