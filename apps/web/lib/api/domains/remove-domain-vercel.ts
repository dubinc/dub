import { prisma } from "@/lib/prisma";
import { getApexDomain } from "@dub/utils";

export const removeDomainFromVercel = async (domain: string) => {
  const apexDomain = getApexDomain(`https://${domain}`);
  const domains = await prisma.domain.findMany({
    where: {
      OR: [
        {
          slug: apexDomain,
        },
        {
          slug: {
            endsWith: `.${apexDomain}`,
          },
        },
      ],
    },
    select: {
      slug: true,
    },
  });
  // if there are other subdomains or the apex domain itself is in use
  // so we should only remove it from our Vercel project
  if (domains.filter((d) => d.slug !== domain).length > 0) {
    return await fetch(
      `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain.toLowerCase()}?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        },
        method: "DELETE",
      },
    ).then((res) => res.json());
  } else {
    // if this is the only domain that is in use
    // we can remove it entirely from our Vercel team
    return await fetch(
      `https://api.vercel.com/v6/domains/${domain.toLowerCase()}?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        },
        method: "DELETE",
      },
    ).then((res) => res.json());
  }
};
