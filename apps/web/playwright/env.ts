import * as z from "zod/v4";


const envSchema = z.object({
  E2E_PARTNER_EMAIL: z.email(),
  E2E_PARTNER_PASSWORD: z.string().min(1),
});

const env = envSchema.parse(process.env);

export { env };
