import { getApexDomain } from "@dub/utils";
import { assertValidDomainFormat, isProxiedDomain } from "./utils";

const getVercelConfigResponse = async (domain: string) => {
  assertValidDomainFormat(domain);
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain.toLowerCase()}/config?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());
};

export const getConfigResponse = async (domain: string) => {
  if (isProxiedDomain(domain)) {
    return {
      misconfigured: false,
      conflicts: [],
    };
  }
  assertValidDomainFormat(domain);
  const apexDomain = getApexDomain(`https://${domain}`);
  if (apexDomain !== domain) {
    const wildcardDomain = `*.${apexDomain}`;
    const wildcardResponse = await getVercelConfigResponse(wildcardDomain);
    if (!wildcardResponse?.error && wildcardResponse?.misconfigured === false) {
      return wildcardResponse;
    }
  }
  return await getVercelConfigResponse(domain);
};
