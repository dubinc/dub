import z from "../zod";

export const affiliateSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
  externalId: z.string().nullish(),
  link: z
    .object({
      id: z.string(),
      domain: z.string(),
      key: z.string(),
      url: z.string(),
    })
    .nullable(),
});
