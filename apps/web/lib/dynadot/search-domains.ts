import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const schema = z.object({
  SearchResponse: z.object({
    ResponseCode: z.enum(["0", "-1"]),
    SearchResults: z.array(
      z.object({
        DomainName: z.string(),
        Available: z.enum(["yes", "no"]),
        Price: z.string().nullish().default(null),
        Status: z.string().nullish().default(null),
      }),
    ),
  }),
});

export const searchDomainsAvailability = async ({
  domain,
}: {
  domain: string;
}) => {
  const domainOnDub = await prisma.domain.findUnique({
    where: {
      slug: domain,
      verified: true,
    },
  });
  if (domainOnDub) {
    return {
      domain: domainOnDub.slug,
      available: false,
      price: null,
    };
  }

  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain0: domain,
    domain1: `get${domain}`,
    domain2: `try${domain}`,
    domain3: `use${domain}`,
    command: "search",
    show_price: "1",
    currency: "USD",
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
    throw new Error(`Failed to search domains: ${response.statusText}`);
  }

  const data = schema.parse(await response.json());

  console.log(JSON.stringify(data, null, 2));

  if (data.SearchResponse.ResponseCode === "-1") {
    throw new Error(`Failed to search domains: ${data.SearchResponse}`);
  }

  return data.SearchResponse.SearchResults.map((result) => ({
    domain: result.DomainName,
    available: result.Available === "yes",
    price: result.Price,
  }));
};
