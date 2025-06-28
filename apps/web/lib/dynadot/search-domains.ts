import z from "@/lib/zod";
import { DubApiError } from "../api/errors";
import { DomainStatusSchema } from "../zod/schemas/domains";
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

  console.log(JSON.stringify(data, null, 2));

  if (data.SearchResponse.ResponseCode === "-1") {
    throw new DubApiError({
      code: "bad_request",
      message: `Failed to search domains: ${data.SearchResponse}`,
    });
  }

  const result = data.SearchResponse.SearchResults.map((result) => {
    const premium = result.Price && /is\s+a Premium Domain/.test(result.Price);

    return {
      domain: result.DomainName,
      available: result.Available === "yes" && !premium,
      price: result.Price,
      premium,
    };
  });

  return DomainStatusSchema.array().parse(result);
};
