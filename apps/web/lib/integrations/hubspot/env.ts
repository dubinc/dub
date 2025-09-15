import { hubSpotEnvSchema } from "./schema";

export const hubSpotEnv = hubSpotEnvSchema.parse(process.env);
