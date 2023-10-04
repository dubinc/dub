import { addDomainToVercel } from "#/lib/api/domains";
import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN_WITH_NGROK } from "#/lib/constants";
import { qstash } from "#/lib/cron";
import prisma from "#/lib/prisma";
import { ShortioDomainProps } from "#/lib/types";
import { redis } from "#/lib/upstash";

export default withProjectAuth(async (req, res, project) => {
  // get Short.io domains and links count
  if (req.method === "GET") {
    const accessToken = await redis.get(`import:short:${project.id}`);
    if (!accessToken) {
      return res.status(400).end("No Short.io access token found");
    }

    const response = await fetch(`https://api.short.io/api/domains`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken as string,
      },
    });
    const data = await response.json();
    if (data.error === "Unauthorized") {
      return res.status(403).end("Invalid Short.io access token");
    }

    const domains = await Promise.all(
      data.map(async ({ id, hostname }: { id: number; hostname: string }) => ({
        id,
        domain: hostname,
        links: await fetch(
          `https://api-v2.short.cm/statistics/domain/${id}?period=total`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: accessToken as string,
            },
          },
        )
          .then((r) => r.json())
          .then((data) => data.links - 1) // subtract 1 to exclude root domain
          .catch((e) => 0),
      })),
    );

    return res.status(200).json(domains);

    // set the user's Short.io access token in Redis
  } else if (req.method === "PUT") {
    const { apiKey } = req.body;

    const response = await redis.set(`import:short:${project.id}`, apiKey);
    return res.status(200).json(response);

    // create job to import links from Short.io
  } else if (req.method === "POST") {
    const { selectedDomains } = req.body as {
      selectedDomains: ShortioDomainProps[];
    };
    console.log({
      selectedDomains,
    });

    // check if there are domains that are not in the project
    // if yes, add them to the project
    const domainsNotInProject = selectedDomains.filter(
      ({ domain }) => !project.domains?.find((d) => d.slug === domain),
    );
    if (domainsNotInProject.length > 0) {
      await Promise.allSettled([
        prisma.domain.createMany({
          data: domainsNotInProject.map(({ domain }) => ({
            slug: domain,
            target: null,
            type: "redirect",
            projectId: project.id,
            primary: false,
          })),
          skipDuplicates: true,
        }),
        domainsNotInProject.map(({ domain }) => addDomainToVercel(domain)),
      ]);
    }

    const response = await Promise.all(
      selectedDomains.map(({ id, domain }) =>
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/short`,
          body: {
            projectId: project.id,
            domainId: id,
            domain,
          },
        }),
      ),
    );

    return res.status(200).json(response);
  }
});
