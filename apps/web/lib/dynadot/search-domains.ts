import { DubApiError } from "../api/errors";
import { DomainStatusSchema } from "../zod/schemas/domains";
import {
  parseRegistrationPriceUsdCents,
  parseRenewalPriceUsdCents,
} from "./calculate-domain-price";
import { dynadotClient } from "./client";

export const searchDomainsAvailability = async ({
  domains,
}: {
  domains: Record<string, string>;
}) => {
  const data = await dynadotClient.search({
    ...domains,
    command: "search",
    show_price: "1",
    currency: "USD",
  });

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
