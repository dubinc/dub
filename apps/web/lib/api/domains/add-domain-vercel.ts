import { getApexDomain, getDomainWithoutWWW } from "@dub/utils";
import { getVercelDomainResponse } from "./get-domain-response";
import { CustomResponse } from "./utils";

export const addDomainToVercel = async (
  domain: string,
  {
    redirectToApex,
  }: {
    redirectToApex?: boolean;
  } = {},
): Promise<CustomResponse> => {
  domain = domain.toLowerCase();

  const apexDomain = getApexDomain(`https://${domain}`);
  if (apexDomain !== domain) {
    const wildcardDomain = `*.${apexDomain}`;
    const wildcardResponse = await getVercelDomainResponse(wildcardDomain);
    if (wildcardResponse.verified) {
      return wildcardResponse;
    }
  }
  return await fetch(
    `https://api.vercel.com/v10/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: domain,
        ...(redirectToApex && {
          redirect: getDomainWithoutWWW(domain),
        }),
      }),
    },
  ).then((res) => res.json());
};
