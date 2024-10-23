import { addDomainToVercel } from "@/lib/api/domains";
import { bulkCreateLinks } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/import/rebrandly – get all Rebrandly domains for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const accessToken = await redis.get(`import:rebrandly:${workspace.id}`);
  if (!accessToken) {
    return new Response("No Rebrandly access token found", { status: 400 });
  }

  const response = await fetch(`https://api.rebrandly.com/v1/domains`, {
    headers: {
      "Content-Type": "application/json",
      apikey: accessToken as string,
    },
  });
  const data = await response.json();
  if (data.error === "Unauthorized") {
    return new Response("Invalid Rebrandly access token", { status: 403 });
  }

  const domains = await Promise.all(
    data
      .filter(({ fullName }) => fullName !== "rebrand.ly")
      .map(async ({ id, fullName }: { id: number; fullName: string }) => ({
        id,
        domain: fullName,
        links: await fetch(
          `https://api.rebrandly.com/v1/links/count?domain.id=${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: accessToken as string,
            },
          },
        )
          .then((r) => r.json())
          .then((data) => data.count) // subtract 1 to exclude root domain
          .catch(() => 0),
      })),
  );

  const tagsCount = await fetch("https://api.rebrandly.com/v1/tags/count", {
    headers: {
      "Content-Type": "application/json",
      apikey: accessToken as string,
    },
  })
    .then((r) => r.json())
    .then((data) => data.count);

  return NextResponse.json({ domains, tagsCount });
});

// PUT /api/workspaces/[idOrSlug]/import/rebrandly - save Rebrandly API key
export const PUT = withWorkspace(async ({ req, workspace }) => {
  const { apiKey } = await req.json();
  const response = await redis.set(`import:rebrandly:${workspace.id}`, apiKey);
  return NextResponse.json(response);
});

// POST /api/workspaces/[idOrSlug]/import/rebrandly - create job to import links from Rebrandly
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const { selectedDomains, importTags } = await req.json();

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
          slug: domain,
          projectId: workspace.id,
          primary: false,
        })),
        skipDuplicates: true,
      }),
      domainsNotInWorkspace.map(({ domain }) => addDomainToVercel(domain)),
    ]);
    await bulkCreateLinks({
      links: domainsNotInWorkspace.map(({ domain }) => ({
        domain,
        key: "_root",
        url: "",
        userId: session?.user?.id,
        projectId: workspace.id,
      })),
    });
  }

  const response = await Promise.all(
    selectedDomains.map(({ id, domain }) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rebrandly`,
        body: {
          workspaceId: workspace.id,
          userId: session?.user?.id,
          domainId: id,
          domain,
          importTags,
        },
      }),
    ),
  );
  return NextResponse.json(response);
});
