import { addDomainToVercel } from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { BitlyGroupProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/import/bitly – get all bitly groups for a project
export const GET = withAuth(async ({ project }) => {
  const accessToken = await redis.get(`import:bitly:${project.id}`);
  if (!accessToken) {
    return new Response("No Bitly access token found", { status: 400 });
  }
  const response = await fetch(`https://api-ssl.bitly.com/v4/groups`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  if (data.message === "FORBIDDEN") {
    return new Response("Invalid Bitly access token", { status: 403 });
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
  ).then((g) => g.filter(({ bsds }) => bsds.length > 0));

  return NextResponse.json(groupsWithTags);
});

// POST /api/projects/[slug]/import/bitly - create job to import links from bitly
export const POST = withAuth(async ({ req, project, session }) => {
  const { selectedDomains, selectedGroupTags } = await req.json();

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
    const existingGroup = result.find((item) => item.bitlyGroup === bitlyGroup);
    if (existingGroup) {
      existingGroup.domains.push(domain);
    } else {
      result.push({
        bitlyGroup,
        domains: [domain],
        importTags: selectedGroupTags.includes(bitlyGroup),
      });
    }
    return result;
  }, []);

  const response = await Promise.all(
    groups
      // only add groups that have at least 1 domain selected for import
      .filter(({ domains }) => domains.length > 0)
      .map(({ bitlyGroup, domains, importTags }) =>
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/bitly`,
          body: {
            projectId: project.id,
            userId: session?.user?.id,
            bitlyGroup,
            domains,
            importTags,
          },
        }),
      ),
  );
  return NextResponse.json(response);
});
