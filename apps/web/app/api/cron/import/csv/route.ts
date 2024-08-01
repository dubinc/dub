import { addDomainToVercel, getDefaultDomains } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { log } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
    const { workspaceId, userId, url, mapping } = body;

    const workspace = (await prisma.project.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        users: {
          where: {
            role: "owner",
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    })) as WorkspaceProps & { users: { user: { email: string } }[] };

    const ownerEmail = workspace?.users[0].user.email ?? "";

    const response = await storage.fetch(url);

    const [domains, defaultDomains] = await Promise.all([
      prisma.domain.findMany({
        where: { projectId: workspace.id },
        select: { slug: true },
      }),
      getDefaultDomains(workspace.id),
    ]);

    const addedDomains: string[] = [];
    let count = 0;

    (await Papa.parse(Readable.fromWeb(response.body as any), {
      header: true,
      skipEmptyLines: true,
      worker: false,
      chunk: async (chunk: {
        data?: Record<string, string>[];
        errors: { message: string }[];
      }) => {
        const { data } = chunk;
        if (!data?.length) {
          console.warn("No data in CSV import chunk", chunk.errors);
          return;
        }

        const selectedDomains = [
          ...new Set(data.map((row) => row[mapping.domain])),
        ];

        // Find domains that need to be added to the workspace
        const domainsNotInWorkspace = selectedDomains.filter(
          (domain) =>
            !domains?.find((d) => d.slug === domain) &&
            !defaultDomains.find((d) => d === domain) &&
            !addedDomains.includes(domain),
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
            domainsNotInWorkspace.flatMap((domain) =>
              addDomainToVercel(domain),
            ),
          ]);
        }

        addedDomains.push(...domainsNotInWorkspace);

        const processedLinks = await Promise.all([
          ...domainsNotInWorkspace.map((domain) =>
            processLink({
              payload: createLinkBodySchema.parse({
                domain,
                key: "_root",
                url: "",
              }),
              workspace: workspace as WorkspaceProps,
              userId,
              bulk: true,
            }),
          ),
          ...data.map((row) =>
            processLink({
              payload: createLinkBodySchema.parse({
                url: row[mapping.url],
                // Special splitting for domains/keys so they can map from a full URL
                domain: row[mapping.domain]
                  .replace(/^https?:\/\//, "")
                  .split("/")[0],
                key: row[mapping.key]
                  .replace(/^https?:\/\//, "")
                  .split("/")
                  .at(-1),
                title: mapping.title ? row[mapping.title] : undefined,
                description: mapping.description
                  ? row[mapping.description]
                  : undefined,
              }),
              workspace: workspace as WorkspaceProps,
              userId,
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

        // TODO: Use errorLinks

        await bulkCreateLinks({
          links: validLinks,
        });

        count += validLinks.length;
      },
    })) as { data: Record<string, string>[] };

    sendEmail({
      subject: `Your CSV links have been imported!`,
      email: ownerEmail,
      react: LinksImported({
        email: ownerEmail,
        provider: "CSV",
        count,
        links: [],
        domains: addedDomains,
        workspaceName: workspace?.name ?? "",
        workspaceSlug: workspace?.slug ?? "",
      }),
    });

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error importing CSV links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
