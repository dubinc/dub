import { createId } from "@/lib/api/create-id";
import { addDomainToVercel } from "@/lib/api/domains";
import { DubApiError } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { BitlyGroupProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/import/bitly – get all bitly groups for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const accessToken = await redis.get(`import:bitly:${workspace.id}`);
  if (!accessToken) {
    throw new DubApiError({
      code: "bad_request",
      message: "No Bitly access token found",
    });
  }
  const response = await fetch(`https://api-ssl.bitly.com/v4/groups`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  if (data.message === "FORBIDDEN") {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid Bitly access token",
    });
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

// POST /api/workspaces/[idOrSlug]/import/bitly - create job to import links from bitly
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const { selectedDomains, selectedGroupTags, folderId } = await req.json();

  const domains = await prisma.domain.findMany({
    where: { projectId: workspace.id },
    select: { slug: true },
  });

  // check if there are domains that are not in the workspace
  // if yes, add them to the workspace
  const domainsNotInWorkspace = selectedDomains.filter(
    ({ domain }) => !domains?.find((d) => d.slug === domain),
  );

  if (domainsNotInWorkspace.length > 0) {
    await Promise.allSettled([
      prisma.domain.createMany({
        data: domainsNotInWorkspace.map(({ domain }) => ({
          id: createId({ prefix: "dom_" }),
          slug: domain,
          projectId: workspace.id,
          primary: false,
        })),
        skipDuplicates: true,
      }),
      domainsNotInWorkspace.flatMap(({ domain }) => addDomainToVercel(domain)),
    ]);
    await bulkCreateLinks({
      links: domainsNotInWorkspace.map(({ domain }) => ({
        domain,
        key: "_root",
        url: "",
        userId: session?.user?.id,
        projectId: workspace.id,
        folderId,
      })),
    });
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
            workspaceId: workspace.id,
            userId: session?.user?.id,
            bitlyGroup,
            domains,
            importTags,
            folderId,
          },
        }),
      ),
  );
  return NextResponse.json(response);
});
