import { z } from "zod";

export const paypalAuthTokenSchema = z.object({
  token: z.object({
    access_token: z.string(),
  }),
});

export const paypalUserInfoSchema = z.object({
  email: z.string(),
  email_verified: z.boolean(), // Indicates whether the user's paypal email address is verified.
});
