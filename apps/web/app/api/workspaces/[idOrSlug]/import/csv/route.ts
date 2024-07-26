import { addDomainToVercel, getDefaultDomains } from "@/lib/api/domains";
import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessedLinkProps } from "@/lib/types";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";

const linkMappingSchema = z.object({
  domain: z.string(),
  url: z.string(),
  key: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/workspaces/[idOrSlug]/import/csv - create job to import links from CSV file
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mapping = linkMappingSchema.parse(
    Object.fromEntries(
      Array.from(formData.entries()).filter(([key]) => key !== "file"),
    ) as Record<string, string>,
  );

  // Use Papa to parse the CSV file
  const { data } = Papa.parse(await file.text(), {
    header: true,
    skipEmptyLines: true,
    worker: false,
  }) as { data: Record<string, string>[] };

  const selectedDomains = [...new Set(data.map((row) => row[mapping.domain]))];

  const [domains, defaultDomains] = await Promise.all([
    prisma.domain.findMany({
      where: { projectId: workspace.id },
      select: { slug: true },
    }),
    getDefaultDomains(workspace.id),
  ]);

  // check if there are domains that are not in the workspace
  // if yes, add them to the workspace
  const domainsNotInWorkspace = selectedDomains.filter(
    (domain) =>
      !domains?.find((d) => d.slug === domain) &&
      !defaultDomains.find((d) => d === domain),
  );

  if (domainsNotInWorkspace.length > 0) {
    await Promise.allSettled([
      prisma.domain.createMany({
        data: domainsNotInWorkspace.map((domain) => ({
          slug: domain,
          projectId: workspace.id,
          primary: false,
        })),
        skipDuplicates: true,
      }),
      domainsNotInWorkspace.flatMap((domain) => addDomainToVercel(domain)),
    ]);
  }

  const processedLinks = await Promise.all([
    ...domainsNotInWorkspace.map((domain) =>
      processLink({
        payload: createLinkBodySchema.parse({
          domain,
          key: "_root",
          url: "",
        }),
        workspace,
        userId: session.user.id,
        bulk: true,
      }),
    ),
    ...data.map((row) =>
      processLink({
        payload: createLinkBodySchema.parse({
          url: row[mapping.url],
          domain: row[mapping.domain],
          key: row[mapping.key],
          title: mapping.title ? row[mapping.title] : undefined,
          description: mapping.description
            ? row[mapping.description]
            : undefined,
        }),
        workspace,
        userId: session.user.id,
        bulk: true,
      }),
    ),
  ]);

  let validLinks = processedLinks
    .filter(({ error }) => error == null)
    .map(({ link }) => link) as ProcessedLinkProps[];

  let errorLinks = processedLinks
    .filter(({ error }) => error != null)
    .map(({ link, error, code }) => ({
      link,
      error,
      code,
    }));

  await bulkCreateLinks({
    links: validLinks,
  });

  // TODO: Use errorLinks
  return NextResponse.json({
    validLinks,
    errorLinks,
  });
});
