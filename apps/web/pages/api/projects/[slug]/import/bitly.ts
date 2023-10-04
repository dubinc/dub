import { addDomainToVercel } from "#/lib/api/domains";
import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN_WITH_NGROK } from "#/lib/constants";
import { qstash } from "#/lib/cron";
import prisma from "#/lib/prisma";
import { BitlyGroupProps } from "#/lib/types";
import { redis } from "#/lib/upstash";

export default withProjectAuth(async (req, res, project) => {
  // get bitly groups and their respective domains
  if (req.method === "GET") {
    const accessToken = await redis.get(`import:bitly:${project.id}`);
    if (!accessToken) {
      return res.status(400).end("No Bitly access token found");
    }

    const response = await fetch(`https://api-ssl.bitly.com/v4/groups`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    if (data.message === "FORBIDDEN") {
      return res.status(403).end("Invalid Bitly access token");
    }

    const groups = data.groups
      // filter for active groups only
      .filter(({ is_active }) => is_active) as BitlyGroupProps[];

    const groupsWithTags = await Promise.all(
      groups.map(async (group) => ({
        ...group,
        tags: await fetch(
          `https://api-ssl.bitly.com/v4/groups/${group.guid}/tags`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
          .then((r) => r.json())
          .then((r) => r.tags),
      })),
    );

    return res.status(200).json(groupsWithTags);

    // create job to import links from bitly
  } else if (req.method === "POST") {
    const { selectedDomains, selectedGroupTags } = req.body;
    console.log({
      selectedDomains,
      selectedGroupTags,
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
        domainsNotInProject.map(({ slug }) => addDomainToVercel(slug)),
      ]);
    }

    // convert data to array of groups with their respective domains
    const groups = selectedDomains.reduce((result, { domain, bitlyGroup }) => {
      const existingGroup = result.find(
        (item) => item.bitlyGroup === bitlyGroup,
      );
      if (existingGroup) {
        existingGroup.domains.push(domain);
      } else {
        result.push({
          bitlyGroup,
          domains: [domain],
          keepTags: selectedGroupTags.includes(bitlyGroup),
        });
      }
      return result;
    }, []);

    const response = await Promise.all(
      groups
        // only add groups that have at least 1 domain selected for import
        .filter(({ domains }) => domains.length > 0)
        .map(({ bitlyGroup, domains, keepTags }) =>
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/bitly`,
            body: {
              projectId: project.id,
              bitlyGroup,
              domains,
              keepTags,
            },
          }),
        ),
    );
    return res.status(200).json(response);
  }
});
