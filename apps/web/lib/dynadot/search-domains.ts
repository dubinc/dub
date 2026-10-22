import { DubApiError } from "../api/errors";
import { HttpClientError } from "../http/base-client";
import { DomainStatusSchema } from "../zod/schemas/domains";
import {
  parseRegistrationPriceUsdCents,
  parseRenewalPriceUsdCents,
} from "./calculate-domain-price";
import { dynadotClient } from "./client";

const SEARCH_TIMEOUT_MS = 10_000;
const SEARCH_ATTEMPTS = 2;

export const searchDomainsAvailability = async ({
  domains,
}: {
  domains: Record<string, string>;
}) => {
  const data = await searchWithRetry({
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

// The user waits for the search result, so retry a network error or timeout once
// with a short timeout, then return an error message the UI can show.
async function searchWithRetry(
  input: Parameters<typeof dynadotClient.search>[0],
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await dynadotClient.search(input, {
        timeout: SEARCH_TIMEOUT_MS,
      });
    } catch (error) {
      // A null status means Dynadot sent no full response (network error or timeout, also during the body read).
      // Request validation errors also have a null status, but the route validates the domain first.
      const noResponse =
        error instanceof HttpClientError && error.status === null;

      if (!noResponse) {
        throw error;
      }

      if (attempt >= SEARCH_ATTEMPTS) {
        throw new DubApiError({
          code: "internal_server_error",
          message:
            "Domain search is unavailable right now. Please try again in a few minutes.",
        });
      }
    }
  }
}
