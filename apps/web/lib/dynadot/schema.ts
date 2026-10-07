import * as z from "zod/v4";

// GET /api3.json?command=search
export const searchDomainsInputSchema = z
  .object({
    command: z.literal("search"),
    show_price: z.string(),
    currency: z.string(),
  })
  .catchall(z.string());

export const searchDomainsOutputSchema = z.object({
  SearchResponse: z.object({
    ResponseCode: z.enum(["0", "-1"]),
    SearchResults: z.array(
      z.object({
        DomainName: z.string(),
        Available: z.enum(["yes", "no"]).nullish().default("no"),
        Price: z.string().nullish().default(null),
        Status: z.string().nullish().default(null),
      }),
    ),
  }),
});

// GET /api3.json?command=register
export const registerDomainInputSchema = z.object({
  command: z.literal("register"),
  domain: z.string(),
  duration: z.string(),
  currency: z.string(),
  coupon: z.string(),
});

export const registerDomainOutputSchema = z.object({
  RegisterResponse: z.object({
    Status: z.string(),
    DomainName: z.string(),
    Error: z.string().optional(),
    Expiration: z.number().optional(),
  }),
});

// GET /api3.json?command=set_renew_option
export const setRenewOptionInputSchema = z.object({
  command: z.literal("set_renew_option"),
  domain: z.string(),
  renew_option: z.enum(["auto", "donot"]),
});

export const setRenewOptionOutputSchema = z.union([
  z.object({
    SetRenewOptionResponse: z.object({
      ResponseCode: z.union([z.number(), z.string()]),
      Status: z.string(),
    }),
  }),

  z.object({
    Response: z.object({
      ResponseCode: z.union([z.number(), z.string()]),
      Error: z.string(),
    }),
  }),
]);
