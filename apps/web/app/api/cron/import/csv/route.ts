import { addDomainToVercel } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks, createLink, processLink } from "@/lib/api/links";
import { createId } from "@/lib/api/utils";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import {
  DEFAULT_LINK_PROPS,
  DUB_DOMAINS_ARRAY,
  getPrettyUrl,
  log,
  normalizeString,
  parseDateTime,
} from "@dub/utils";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Readable } from "stream";
import { sendCsvImportEmails } from "./utils";

export const dynamic = "force-dynamic";

// Type for mapper return value
type MapperResult =
  | {
      success: true;
      data: {
        domain: string;
        key: string;
        createdAt?: Date;
        tags?: string[];
        [key: string]: any;
      };
    }
  | {
      success?: false;
      error: string;
      link: { domain: string; key: string };
    };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
    const { workspaceId, userId, id, url } = body;
    const mapping = linkMappingSchema.parse(body.mapping);

    if (!id || !url) throw new Error("Missing ID or URL for the import file");

    const mapper = (row: Record<string, string>): MapperResult => {
      const getValueByNormalizedKey = (targetKey: string): string => {
        const key = Object.keys(row).find(
          (k) => normalizeString(k) === normalizeString(targetKey),
        );
        return key ? row[key].trim() : "";
      };

      // Validate required fields
      const linkValue = getValueByNormalizedKey(mapping.link);
      if (!linkValue) {
        return {
          error: "Missing link value",
          link: { domain: "unknown", key: "unknown" },
        };
      }

      const linkUrl = getPrettyUrl(linkValue);
      if (!linkUrl) {
        return {
          error: "Invalid link format",
          link: { domain: "unknown", key: "unknown" },
        };
      }

      const domain = linkUrl.split("/")[0];
      const key = linkUrl.split("/").slice(1).join("/") || "_root";

      try {
        return {
          success: true,
          data: {
            ...Object.fromEntries(
              Object.entries(mapping).map(([key, value]) => [
                key,
                getValueByNormalizedKey(value),
              ]),
            ),
            domain,
            key,
            createdAt: mapping.createdAt
              ? parseDateTime(getValueByNormalizedKey(mapping.createdAt)) ||
                undefined
              : undefined,
            tags: mapping.tags
              ? getValueByNormalizedKey(mapping.tags)
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => normalizeString(tag))
              : undefined,
          },
        };
      } catch (error) {
        return {
          error: error.message || "Error processing row",
          link: { domain, key },
        };
      }
    };

    let cursor = parseInt(
      (await redis.get(`import:csv:${workspaceId}:${id}:cursor`)) ?? "0",
    );

    let count = cursor; // Count the total number of links added

    const workspace = (await prisma.project.findUniqueOrThrow({
      where: { id: workspaceId },
    })) as WorkspaceProps;

    const response = await storage.fetch(url);

    const [tags, domains] = await Promise.all([
      prisma.tag.findMany({
        where: { projectId: workspace.id },
        select: { name: true },
      }),
      prisma.domain.findMany({
        where: { projectId: workspace.id },
        select: { slug: true },
      }),
    ]);

    const addedTags: string[] = [];
    const addedDomains: string[] = [];

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
            parser.resume();
            return;
          }

          // Find links that already exist in the workspace
          const alreadyCreatedLinks = await prisma.link.findMany({
            where: {
              domain: {
                in: domains.map((domain) => domain.slug),
              },
              key: {
                in: data.map((row) => {
                  const result = mapper(row);
                  return "success" in result && result.success
                    ? result.data.key
                    : result.link.key;
                }),
              },
            },
            select: {
              domain: true,
              key: true,
            },
          });

          // Fix the linksToCreate typing and filtering
          const linksToCreate = data
            .map((row) => mapper(row))
            .filter(
              (result): result is Extract<MapperResult, { success: true }> =>
                "success" in result &&
                result.success === true &&
                !alreadyCreatedLinks.some(
                  (l) =>
                    l.domain === result.data.domain &&
                    l.key === result.data.key,
                ) &&
                result.data.key !== "_root",
            )
            .map((result) => result.data);

          // Fix the selectedTags extraction
          const selectedTags = [
            ...new Set(
              linksToCreate
                .map(({ tags }) => tags || [])
                .flat()
                .filter((tag): tag is string => Boolean(tag)),
            ),
          ];

          // Find tags that need to be added to the workspace
          const tagsNotInWorkspace = selectedTags.filter(
            (tag) =>
              !tags.find((t) => t.name.toLowerCase() === tag.toLowerCase()) &&
              !addedTags.find((t) => t.toLowerCase() === tag.toLowerCase()),
          );

          // Add missing tags to the workspace
          if (tagsNotInWorkspace.length > 0) {
            await prisma.tag.createMany({
              data: tagsNotInWorkspace.map((tag) => ({
                id: createId({ prefix: "tag_" }),
                name: tag,
                color: randomBadgeColor(),
                projectId: workspace.id,
              })),
              skipDuplicates: true,
            });
          }

          addedTags.push(...tagsNotInWorkspace);

          const selectedDomains = [
            ...new Set(linksToCreate.map(({ domain }) => domain)),
          ];

          // Find domains that need to be added to the workspace
          const domainsNotInWorkspace = selectedDomains.filter(
            (domain) =>
              !domains?.find((d) => d.slug === domain) &&
              !DUB_DOMAINS_ARRAY.includes(domain) &&
              !addedDomains.includes(domain),
          );

          // Add missing domains to the workspace
          if (domainsNotInWorkspace.length > 0) {
            await Promise.allSettled([
              // create domains in DB
              prisma.domain.createMany({
                data: domainsNotInWorkspace.map((domain) => ({
                  id: createId({ prefix: "dom_" }),
                  slug: domain,
                  projectId: workspace.id,
                  primary: false,
                })),
                skipDuplicates: true,
              }),
              // create domains in Vercel
              domainsNotInWorkspace.map((domain) => addDomainToVercel(domain)),
              // create links for domains
              domainsNotInWorkspace.map((domain) =>
                createLink({
                  ...DEFAULT_LINK_PROPS,
                  domain,
                  key: "_root",
                  url: "",
                  tags: undefined,
                  userId,
                  projectId: workspace.id,
                }),
              ),
            ]);
          }

          addedDomains.push(...domainsNotInWorkspace);

          // Fix the processedLinks typing
          type ProcessedLink = {
            error: string | null;
            link: ProcessedLinkProps;
          };

          const processedLinks = await Promise.all(
            linksToCreate.map(
              ({ createdAt, tags, ...link }) =>
                processLink({
                  payload: {
                    ...createLinkBodySchema.parse({
                      ...link,
                      tagNames: tags || undefined,
                    }),
                    createdAt: createdAt?.toISOString(),
                  },
                  workspace,
                  userId,
                  bulk: true,
                }) as Promise<ProcessedLink>,
            ),
          );

          let validLinks = processedLinks
            .filter(({ error }) => error == null)
            .map(({ link }) => link) as ProcessedLinkProps[];

          let errorLinks = processedLinks
            .filter(({ error }) => error != null)
            .map(({ link: { domain, key }, error }) => ({
              domain,
              key,
              error,
            }));

          // Keep track of error links
          if (errorLinks.length > 0) {
            await redis.rpush(
              `import:csv:${workspaceId}:${id}:failed`,
              ...errorLinks,
            );
          }

          // Create all links
          await bulkCreateLinks({
            links: validLinks,
          });

          if (selectedDomains.length > 0) {
            await redis.sadd(
              `import:csv:${workspaceId}:${id}:domains`,
              ...selectedDomains,
            );
          }

          count += validLinks.length;

          cursor += data.length;
          await redis.set(`import:csv:${workspaceId}:${id}:cursor`, cursor);

          parser.resume();
        },
      });
    });

    const errorLinks = (await redis.lrange(
      `import:csv:${workspaceId}:${id}:failed`,
      0,
      -1,
    )) as any;

    const affectedDomains = (await redis.smembers(
      `import:csv:${workspaceId}:${id}:domains`,
    )) as any;

    await sendCsvImportEmails({
      workspaceId,
      count,
      domains:
        Array.isArray(affectedDomains) && affectedDomains.length > 0
          ? affectedDomains
          : [],
      errorLinks:
        Array.isArray(errorLinks) && errorLinks.length > 0 ? errorLinks : [],
    });

    // Clear out storage file and redis keys
    const clearResults = await Promise.allSettled([
      storage.delete(url),
      redis.del(`import:csv:${workspaceId}:${id}:cursor`),
      redis.del(`import:csv:${workspaceId}:${id}:failed`),
      redis.del(`import:csv:${workspaceId}:${id}:domains`),
    ]);
    clearResults.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(`Error clearing CSV import data (${idx})`, result.reason);
      }
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
