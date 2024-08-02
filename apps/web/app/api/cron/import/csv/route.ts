import { addDomainToVercel, getDefaultDomains } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
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
    const { workspaceId, userId, id, url } = body;
    const mapping = linkMappingSchema.parse(body.mapping);

    if (!id || !url) throw new Error("Missing ID or URL for the import file");

    let cursor = parseInt(
      (await redis.get(`import:csv:${workspaceId}:${id}:cursor`)) ?? "0",
    );

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

    await new Promise((resolve, reject) => {
      Papa.parse(Readable.fromWeb(response.body as any), {
        header: true,
        skipEmptyLines: true,
        skipFirstNLines: cursor,
        worker: false,
        complete: resolve,
        error: reject,
        chunk: async (
          chunk: {
            data?: Record<string, string>[];
            errors: { message: string }[];
          },
          parser,
        ) => {
          parser.pause(); // Pause parsing until we finish processing this chunk

          const { data } = chunk;
          if (!data?.length) {
            console.warn("No data in CSV import chunk", chunk.errors);
            return;
          }

          // Find links that already exist in the workspace (we still need to double check matching both domain and key)
          const alreadyCreatedLinks = await prisma.link.findMany({
            where: {
              domain: {
                in: domains.map((domain) => domain.slug),
              },
              key: {
                in: data.map((row) => row[mapping.key]),
              },
            },
            select: {
              domain: true,
              key: true,
            },
          });

          const linksToCreate = data
            .filter(
              (row) =>
                !alreadyCreatedLinks.some(
                  (l) =>
                    l.domain === row[mapping.domain] &&
                    l.key === row[mapping.key],
                ),
            )
            .map((row) =>
              Object.fromEntries(
                Object.entries(mapping).map(([key, value]) => [
                  key,
                  row[value],
                ]),
              ),
            );

          const selectedDomains = [
            ...new Set(linksToCreate.map(({ domain }) => domain)),
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
            ...linksToCreate.map((link) =>
              processLink({
                payload: createLinkBodySchema.parse({
                  ...link,
                  // Special splitting for domains/keys so they can map from a full URL
                  domain: link.domain.replace(/^https?:\/\//, "").split("/")[0],
                  key: link.key
                    .replace(/^https?:\/\//, "")
                    .split("/")
                    .at(-1),
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

          cursor += data.length;
          await redis.set(`import:csv:${workspaceId}:${id}:cursor`, cursor);

          parser.resume();
        },
      });
    });

    await redis.del(`import:csv:${workspaceId}:${id}:cursor`);

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
