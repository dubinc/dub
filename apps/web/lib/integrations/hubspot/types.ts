import { z } from "zod";
import { hubSpotAuthTokenSchema, hubSpotContactSchema } from "./schema";

export type HubSpotAuthToken = z.infer<typeof hubSpotAuthTokenSchema>;

export type HubSpotContact = z.infer<typeof hubSpotContactSchema>;
