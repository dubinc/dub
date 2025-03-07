import { createId } from "@/lib/api/create-id";
import { addDomainToVercel } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks, createLink, processLink } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  DEFAULT_LINK_PROPS,
  DUB_DOMAINS_ARRAY,
  getPrettyUrl,
  linkConstructorSimple,
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

// Define interface for tag and domain objects
interface TagItem {
  name: string;
}

interface DomainItem {
  slug: string;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = JSON.parse(rawBody);
    const { workspaceId, userId, id, folderId, url } = body;
    const mapping = linkMappingSchema.parse(body.mapping);

    if (!id || !url) throw new Error("Missing ID or URL for the import file");

    // Get the current cursor position
    let cursor = parseInt(
      (await redis.get(`import:csv:${workspaceId}:${id}:cursor`)) ?? "0",
    );

    // Clean up Redis keys if this is the first execution to avoid type conflicts
    if (cursor === 0) {
      // First execution - clean up any existing keys
      await Promise.allSettled([
        redis.del(`import:csv:${workspaceId}:${id}:domains_list`),
        redis.del(`import:csv:${workspaceId}:${id}:domains_cache`),
        redis.del(`import:csv:${workspaceId}:${id}:failed`),
        redis.del(`import:csv:${workspaceId}:${id}:count`),
        redis.del(`import:csv:${workspaceId}:${id}:filesize`),
        redis.del(`import:csv:${workspaceId}:${id}:tags_cache`),
      ]);

      // Reset cursor in case it was deleted above
      cursor = 0;
    }

    // Define the mapper function
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
            shortLink: linkConstructorSimple({
              domain,
              key,
            }),
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

    // Get the total count of processed links
    let count = parseInt(
      (await redis.get(`import:csv:${workspaceId}:${id}:count`)) ?? "0",
    );

    // Define a reasonable batch size for a single function execution
    const MAX_ROWS_PER_EXECUTION = 1000;

    // Get workspace info - needed for both processing and potential completion
    const workspace = (await prisma.project.findUniqueOrThrow({
      where: { id: workspaceId },
    })) as WorkspaceProps;

    let tags: TagItem[] = [];
    let domains: DomainItem[] = [];

    // Check if this is the first execution (cursor = 0)
    if (cursor === 0) {
      // First execution - fetch metadata to check total size
      // Note: storage.fetch might not support the second options parameter in some implementations
      // If that's the case, we can skip the content-length check
      let contentLength = 0;
      try {
        const headResponse = await fetch(url, { method: "HEAD" });
        contentLength = parseInt(
          headResponse.headers.get("content-length") || "0",
        );

        // Store file size for future reference if available
        if (contentLength > 0) {
          await redis.set(
            `import:csv:${workspaceId}:${id}:filesize`,
            contentLength,
          );
        }
      } catch (error) {
        console.warn(
          "Error fetching content length, continuing anyway:",
          error,
        );
      }

      // Initial fetch of workspace data
      const [fetchedTags, fetchedDomains] = await Promise.all([
        prisma.tag.findMany({
          where: { projectId: workspace.id },
          select: { name: true },
        }),
        prisma.domain.findMany({
          where: { projectId: workspace.id },
          select: { slug: true },
        }),
      ]);

      tags = fetchedTags as TagItem[];
      domains = fetchedDomains as DomainItem[];

      // Cache these results for future executions - use different keys for the cache
      await redis.set(
        `import:csv:${workspaceId}:${id}:tags_cache`,
        JSON.stringify(tags),
      );
      await redis.set(
        `import:csv:${workspaceId}:${id}:domains_cache`,
        JSON.stringify(domains),
      );
    } else {
      // Fetch cached data from previous runs
      try {
        const cachedTagsStr = await redis.get(
          `import:csv:${workspaceId}:${id}:tags_cache`,
        );
        const cachedDomainsStr = await redis.get(
          `import:csv:${workspaceId}:${id}:domains_cache`,
        );

        if (cachedTagsStr) {
          tags = JSON.parse(cachedTagsStr as string) as TagItem[];
        }
        if (cachedDomainsStr) {
          domains = JSON.parse(cachedDomainsStr as string) as DomainItem[];
        }
      } catch (error) {
        console.warn("Error parsing cached data, fetching fresh data:", error);
        // If there's an error with cached data, fetch fresh data
        const [fetchedTags, fetchedDomains] = await Promise.all([
          prisma.tag.findMany({
            where: { projectId: workspace.id },
            select: { name: true },
          }),
          prisma.domain.findMany({
            where: { projectId: workspace.id },
            select: { slug: true },
          }),
        ]);

        tags = fetchedTags as TagItem[];
        domains = fetchedDomains as DomainItem[];

        // Update the cache
        await redis.set(
          `import:csv:${workspaceId}:${id}:tags_cache`,
          JSON.stringify(tags),
        );
        await redis.set(
          `import:csv:${workspaceId}:${id}:domains_cache`,
          JSON.stringify(domains),
        );
      }
    }

    // Fetch the file content for parsing
    const response = await storage.fetch(url);

    const addedTags: string[] = [];
    const addedDomains: string[] = [];
    let processedRowsInThisExecution = 0;
    let isFileComplete = false;

    await new Promise((resolve, reject) => {
      Papa.parse(Readable.fromWeb(response.body as any), {
        header: true,
        skipEmptyLines: true,
        skipFirstNLines: cursor,
        worker: false,
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

          // Process in smaller batches to avoid connection pool timeout
          const BATCH_SIZE = 100;

          for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batchData = data.slice(i, i + BATCH_SIZE);

            try {
              // Map the rows to our format
              const mappedBatch = batchData.map((row) => mapper(row));

              // Find links that already exist in the workspace
              const alreadyCreatedLinks = await prisma.link.findMany({
                where: {
                  shortLink: {
                    in: mappedBatch.map((result): string => {
                      if ("success" in result && result.success) {
                        return result.data.shortLink;
                      } else {
                        return linkConstructorSimple({
                          domain: result.link.domain,
                          key: result.link.key,
                        });
                      }
                    }),
                  },
                },
                select: {
                  shortLink: true,
                },
              });

              // Filter out links that already exist
              const linksToCreate = mappedBatch
                .filter(
                  (
                    result,
                  ): result is Extract<MapperResult, { success: true }> =>
                    "success" in result &&
                    result.success === true &&
                    !alreadyCreatedLinks.some(
                      (l) => l.shortLink === result.data.shortLink,
                    ) &&
                    result.data.key !== "_root",
                )
                .map((result) => result.data);

              // Extract tags that need to be created
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
                  !tags.some(
                    (t) => t.name.toLowerCase() === tag.toLowerCase(),
                  ) &&
                  !addedTags.some((t) => t.toLowerCase() === tag.toLowerCase()),
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

              // Extract domains that need to be created
              const selectedDomains = [
                ...new Set(linksToCreate.map(({ domain }) => domain)),
              ];

              // Find domains that need to be added to the workspace
              const domainsNotInWorkspace = selectedDomains.filter(
                (domain) =>
                  !domains.some((d) => d.slug === domain) &&
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
                  ...domainsNotInWorkspace.map((domain) =>
                    addDomainToVercel(domain),
                  ),
                  // create links for domains
                  ...domainsNotInWorkspace.map((domain) =>
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

              // Process links
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
                        folderId,
                        createdAt: createdAt?.toISOString(),
                      },
                      workspace,
                      userId,
                      bulk: true,
                    }) as Promise<ProcessedLink>,
                ),
              );

              let validLinksInBatch = processedLinks
                .filter(({ error }) => error == null)
                .map(({ link }) => link) as ProcessedLinkProps[];

              let errorLinksInBatch = processedLinks
                .filter(({ error }) => error != null)
                .map(({ link: { domain, key }, error }) => ({
                  domain,
                  key,
                  error,
                }));

              // Keep track of error links
              if (errorLinksInBatch.length > 0) {
                await redis.rpush(
                  `import:csv:${workspaceId}:${id}:failed`,
                  ...errorLinksInBatch,
                );
              }

              // Create all links
              if (validLinksInBatch.length > 0) {
                await bulkCreateLinks({
                  links: validLinksInBatch,
                });
              }

              if (selectedDomains.length > 0) {
                // Use a different key for the list of affected domains
                await redis.rpush(
                  `import:csv:${workspaceId}:${id}:domains_list`,
                  ...selectedDomains,
                );
              }

              // Update counter for this batch
              count += validLinksInBatch.length;

              // Add a small delay between batches
              await new Promise((r) => setTimeout(r, 100));
            } catch (error) {
              console.error("Error processing batch", error);
              // Log error but continue with next batch
              await log({
                message: `Error in CSV import batch: ${error.message}`,
                type: "cron",
              });
            }
          }

          processedRowsInThisExecution += data.length;

          // Update total count in Redis periodically
          await redis.set(`import:csv:${workspaceId}:${id}:count`, count);

          // Update cursor for next execution
          cursor += data.length;
          await redis.set(`import:csv:${workspaceId}:${id}:cursor`, cursor);

          // If we've processed enough rows in this execution, stop
          if (processedRowsInThisExecution >= MAX_ROWS_PER_EXECUTION) {
            parser.abort(); // Stop parsing
            isFileComplete = false;
            resolve(null);
            return;
          }

          parser.resume();
        },
        complete: () => {
          isFileComplete = true;
          resolve(null);
        },
        error: reject,
      });
    });

    // If file is not complete, schedule the next batch
    if (!isFileComplete) {
      try {
        // Get the retry count from Redis or initialize as 0
        const retryCount = parseInt(
          (await redis.get(`import:csv:${workspaceId}:${id}:retry_count`)) ??
            "0",
        );

        // Get the previous cursor to check if we're making progress
        const previousCursor = parseInt(
          (await redis.get(
            `import:csv:${workspaceId}:${id}:previous_cursor`,
          )) ?? "0",
        );

        // Store current cursor for next comparison
        await redis.set(
          `import:csv:${workspaceId}:${id}:previous_cursor`,
          cursor,
        );

        // Check for potential infinite loop conditions
        const MAX_RETRIES = 50; // Set reasonable max based on your file sizes
        const noProgress =
          cursor === previousCursor && processedRowsInThisExecution === 0;

        if (retryCount >= MAX_RETRIES || noProgress) {
          // Abort the import process
          await log({
            message: `CSV import aborted after ${retryCount} attempts - possible infinite loop detected. WorkspaceId: ${workspaceId}, ImportId: ${id}`,
            type: "cron",
          });

          // Clean up Redis keys
          await Promise.allSettled([
            storage.delete(url),
            redis.del(`import:csv:${workspaceId}:${id}:cursor`),
            redis.del(`import:csv:${workspaceId}:${id}:count`),
            redis.del(`import:csv:${workspaceId}:${id}:failed`),
            redis.del(`import:csv:${workspaceId}:${id}:filesize`),
            redis.del(`import:csv:${workspaceId}:${id}:tags_cache`),
            redis.del(`import:csv:${workspaceId}:${id}:domains_cache`),
            redis.del(`import:csv:${workspaceId}:${id}:domains_list`),
            redis.del(`import:csv:${workspaceId}:${id}:retry_count`),
            redis.del(`import:csv:${workspaceId}:${id}:previous_cursor`),
          ]);

          // Send notification email about the aborted import
          try {
            await sendCsvImportEmails({
              workspaceId,
              count,
              domains: [],
              errorLinks: [],
            });
          } catch (emailError) {
            console.error("Error sending abort notification email", emailError);
          }

          return NextResponse.json({
            response: "error",
            message: "Import aborted due to possible infinite loop",
            processed: count,
          });
        }

        // Increment retry count
        await redis.set(
          `import:csv:${workspaceId}:${id}:retry_count`,
          retryCount + 1,
        );

        // Schedule next batch
        await qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
          body: {
            workspaceId,
            userId,
            id,
            folderId,
            url,
            mapping,
          },
        });

        return NextResponse.json({
          response: "in_progress",
          processed: count,
          cursor,
        });
      } catch (error) {
        console.error("Error scheduling next batch", error);
        await log({
          message: `Error scheduling next CSV import batch: ${error.message}`,
          type: "cron",
        });
        // Even if scheduling fails, return a success response with in_progress status
        return NextResponse.json({
          response: "in_progress",
          processed: count,
          cursor,
          error: "Failed to schedule next batch. Please try again.",
        });
      }
    }

    // File is complete, send completion email and cleanup
    let errorLinks: any[] = [];
    try {
      const errorLinksRaw = await redis.lrange(
        `import:csv:${workspaceId}:${id}:failed`,
        0,
        -1,
      );

      errorLinks = (errorLinksRaw || []).map((item) => {
        try {
          return JSON.parse(item as string);
        } catch (e) {
          return item;
        }
      });
    } catch (error) {
      console.error("Error getting error links", error);
    }

    let affectedDomains: string[] = [];
    try {
      // Use the list key for affected domains
      affectedDomains = (await redis.lrange(
        `import:csv:${workspaceId}:${id}:domains_list`,
        0,
        -1,
      )) as string[];

      // Remove duplicates (since lists can have duplicates)
      affectedDomains = [...new Set(affectedDomains)];
    } catch (error) {
      console.error("Error getting affected domains", error);
    }

    // Send email notification about the import
    try {
      await sendCsvImportEmails({
        workspaceId,
        count,
        domains: Array.isArray(affectedDomains) ? affectedDomains : [],
        errorLinks: Array.isArray(errorLinks) ? errorLinks : [],
      });
    } catch (error) {
      console.error("Error sending CSV import emails", error);
      await log({
        message: `Error sending CSV import completion email: ${error.message}`,
        type: "cron",
      });
    }

    // Clear out storage file and redis keys
    try {
      const clearResults = await Promise.allSettled([
        storage.delete(url),
        redis.del(`import:csv:${workspaceId}:${id}:cursor`),
        redis.del(`import:csv:${workspaceId}:${id}:count`),
        redis.del(`import:csv:${workspaceId}:${id}:failed`),
        redis.del(`import:csv:${workspaceId}:${id}:filesize`),
        redis.del(`import:csv:${workspaceId}:${id}:tags_cache`),
        redis.del(`import:csv:${workspaceId}:${id}:domains_cache`),
        redis.del(`import:csv:${workspaceId}:${id}:domains_list`),
      ]);

      clearResults.forEach((result, idx) => {
        if (result.status === "rejected") {
          console.error(
            `Error clearing CSV import data (${idx})`,
            result.reason,
          );
        }
      });
    } catch (error) {
      console.error("Error clearing Redis keys", error);
    }

    return NextResponse.json({
      response: "success",
      processed: count,
    });
  } catch (error) {
    await log({
      message: `Error importing CSV links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
