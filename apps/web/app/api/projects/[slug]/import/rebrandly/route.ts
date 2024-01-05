import { addDomainToVercel } from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/import/rebrandly – get all Rebrandly domains for a project
export const GET = withAuth(async ({ project }) => {
  const accessToken = await redis.get(`import:rebrandly:${project.id}`);
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

// PUT /api/projects/[slug]/import/rebrandly - save Rebrandly API key
export const PUT = withAuth(async ({ req, project }) => {
  const { apiKey } = await req.json();
  const response = await redis.set(`import:rebrandly:${project.id}`, apiKey);
  return NextResponse.json(response);
});

// POST /api/projects/[slug]/import/rebrandly - create job to import links from Rebrandly
export const POST = withAuth(async ({ req, project, session }) => {
  const { selectedDomains, importTags } = await req.json();

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
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rebrandly`,
        body: {
          projectId: project.id,
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
