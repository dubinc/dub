import { addDomainToVercel } from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/import/short – get all short.io domains for a project
export const GET = withAuth(async ({ project }) => {
  const accessToken = await redis.get(`import:short:${project.id}`);
  if (!accessToken) {
    return new Response("No Short.io access token found", { status: 400 });
  }

  const response = await fetch(`https://api.short.io/api/domains`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken as string,
    },
  });
  const data = await response.json();
  if (data.error === "Unauthorized") {
    return new Response("Invalid Short.io access token", { status: 403 });
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

  return NextResponse.json(domains);
});

// PUT /api/projects/[slug]/import/short - save Short.io API key
export const PUT = withAuth(async ({ req, project }) => {
  const { apiKey } = await req.json();
  const response = await redis.set(`import:short:${project.id}`, apiKey);
  return NextResponse.json(response);
});

// POST /api/projects/[slug]/import/short - create job to import links from Short.io
export const POST = withAuth(async ({ req, project, session }) => {
  const { selectedDomains } = await req.json();

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
          userId: session?.user?.id,
          domainId: id,
          domain,
        },
      }),
    ),
  );
  return NextResponse.json(response);
});
