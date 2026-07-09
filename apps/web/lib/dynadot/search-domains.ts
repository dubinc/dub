import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { DomainStatusSchema } from "../zod/schemas/domains";
import {
  parseRegistrationPriceUsdCents,
  parseRenewalPriceUsdCents,
} from "./calculate-domain-price";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const schema = z.object({
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

export const searchDomainsAvailability = async ({
  domains,
}: {
  domains: Record<string, string>;
}) => {
  const searchParams = new URLSearchParams({
    ...domains,
    command: "search",
    show_price: "1",
    currency: "USD",
    key: DYNADOT_API_KEY,
  });

  const response = await fetch(
    `${DYNADOT_BASE_URL}?${searchParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new DubApiError({
      code: "bad_request",
      message: `Failed to search domains: ${response.statusText}`,
    });
  }

  const data = schema.parse(await response.json());

  if (data.SearchResponse.ResponseCode === "-1") {
    throw new DubApiError({
      code: "bad_request",
      message: `Failed to search domains: ${data.SearchResponse}`,
    });
  }

  const result = data.SearchResponse.SearchResults.map((result) => {
    const available = result.Available === "yes";
    const premium = Boolean(
      result.Price && /is\s+a Premium Domain/.test(result.Price),
    );
    const registrationPriceUsdCents = parseRegistrationPriceUsdCents(
      result.Price,
    );
    const renewalPriceUsdCents = parseRenewalPriceUsdCents(result.Price);

    return {
      domain: result.DomainName,
      available,
      premium,
      prices: available
        ? {
            registration: premium ? registrationPriceUsdCents : 0,
            renewal: renewalPriceUsdCents,
          }
        : null,
      price: "Deprecated: Use `prices` instead.",
    };
  });

  return DomainStatusSchema.array().parse(result);
};
