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
  linkConstructorSimple,
  log,
  normalizeString,
  parseDateTime,
} from "@dub/utils";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Readable } from "stream";
import { z } from "zod";
import { sendCsvImportEmails } from "./utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  folderId: z.string().nullable(),
  url: z.string(),
  mapping: linkMappingSchema,
  action: z.enum(["queue-links", "process-links"]).default("queue-links"),
});

interface MapperResult {
  success: boolean;
  error?: string;
  data?: {
    domain: string;
    key: string;
    url: string;
    title?: string;
    description?: string;
    tags?: string[];
    createdAt?: Date;
  };
}

interface ErrorLink {
  domain: string;
  key: string;
  error: string;
}

// POST /api/cron/import/csv
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const payload = payloadSchema.parse(JSON.parse(rawBody));
    const { action } = payload;

    console.time("import:csv");

    if (action === "queue-links") {
      await prepareRows(payload); // add rows to Redis
    } else if (action === "process-links") {
      await processRows(payload); // process rows in Redis
    }

    console.timeEnd("import:csv");

    return NextResponse.json("OK");
  } catch (error) {
    await log({
      message: `Error importing CSV links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

// Add rows to Redis
const prepareRows = async (payload: z.infer<typeof payloadSchema>) => {
  const { id, url, workspaceId } = payload;

  if (!id || !url) {
    throw new Error("Missing ID or URL for the import file.");
  }

  const response = await storage.fetch(url);
  if (!response || !response.body) {
    throw new Error("CSV import file not found.");
  }

  const BATCH_SIZE = 1000; // Push 1000 rows to Redis at a time
  const redisKey = `import:csv:${workspaceId}:${id}:rows`;
  let rows: Record<string, string>[] = [];

  await new Promise((resolve, reject) => {
    Papa.parse(Readable.fromWeb(response.body as any), {
      header: true,
      skipEmptyLines: true,
      worker: false,
      complete: (results) => {
        resolve(results);
      },
      error: reject,
      step: async (results: { data: Record<string, string> }, parser) => {
        parser.pause();
        rows.push(results.data);

        if (rows.length >= BATCH_SIZE) {
          await redis.lpush(redisKey, ...rows);
          rows = [];
        }

        parser.resume();
      },
    });
  });

  // Add any remaining rows to Redis
  if (rows.length > 0) {
    await redis.lpush(redisKey, ...rows);
  }

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
    body: {
      ...payload,
      action: "process-links",
    },
  });
};

// Process rows in Redis
const processRows = async (payload: z.infer<typeof payloadSchema>) => {
  const { id, workspaceId, mapping } = payload;
  const redisKey = `import:csv:${workspaceId}:${id}`;
  const BATCH_SIZE = 500; // Process 500 links at a time

  const rows = await redis.lpop<Record<string, string>[]>(
    `${redisKey}:rows`,
    BATCH_SIZE,
  );

  if (rows && rows.length > 0) {
    const mappedLinks: MapperResult[] = rows.map((row) =>
      mapCsvRowToLink(row, mapping),
    );

    await processMappedLinks({
      mappedLinks,
      payload,
    });

    await redis.incrby(`${redisKey}:processed`, rows.length);

    if (rows.length === BATCH_SIZE) {
      return await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
        body: {
          ...payload,
          action: "process-links",
        },
      });
    }
  }

  // Finished processing all rows
  const errorLinks = await redis.lrange<ErrorLink>(`${redisKey}:failed`, 0, -1);

  const createdCount = parseInt(
    (await redis.get(`${redisKey}:created`)) || "0",
  );

  const domains = await redis.smembers(`${redisKey}:domains`);

  await sendCsvImportEmails({
    workspaceId,
    count: createdCount,
    domains,
    errorLinks,
  });

  await Promise.allSettled([
    redis.del(`${redisKey}:cursor`),
    redis.del(`${redisKey}:created`),
    redis.del(`${redisKey}:failed`),
    redis.del(`${redisKey}:domains`),
    redis.del(`${redisKey}:rows`),
    redis.del(`${redisKey}:processed`),
    storage.delete(payload.url),
  ]);
};

// Map a CSV row to a link
const mapCsvRowToLink = (
  row: Record<string, string>,
  mapping: z.infer<typeof linkMappingSchema>,
): MapperResult => {
  try {
    // Helper function to get value from CSV row using case-insensitive matching
    const getValueByKey = (targetKey: string) => {
      const key = Object.keys(row).find(
        (k) => normalizeString(k) === normalizeString(targetKey),
      );

      return key ? row[key].trim() : "";
    };

    const linkValue = getValueByKey(mapping.link);
    const urlValue = getValueByKey(mapping.url);

    if (!linkValue) {
      return {
        success: false,
        error: "Missing required field: link",
      };
    }

    if (!urlValue) {
      return {
        success: false,
        error: "Missing required field: url",
      };
    }

    const [domain, ...keyParts] = linkValue.split("/");
    const key = keyParts.join("/") || "_root";

    try {
      new URL(urlValue);
    } catch {
      return {
        success: false,
        error: `Invalid URL format: ${urlValue}`,
      };
    }

    const link: MapperResult["data"] = {
      domain,
      key,
      url: urlValue,
    };

    if (mapping.title) {
      const title = getValueByKey(mapping.title);

      if (title) {
        link.title = title;
      }
    }

    if (mapping.description) {
      const description = getValueByKey(mapping.description);

      if (description) {
        link.description = description;
      }
    }

    if (mapping.createdAt) {
      const createdAt = getValueByKey(mapping.createdAt);

      if (createdAt) {
        const date = parseDateTime(createdAt);

        if (date) {
          link.createdAt = date;
        }
      }
    }

    if (mapping.tags) {
      const tags = getValueByKey(mapping.tags);

      if (tags) {
        link.tags = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => normalizeString(tag));
      }
    }

    return {
      success: true,
      data: link,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Process the mapped links and create the tag/domain/link in the database
const processMappedLinks = async ({
  mappedLinks,
  payload,
}: {
  mappedLinks: MapperResult[];
  payload: z.infer<typeof payloadSchema>;
}) => {
  const { id, workspaceId, userId, folderId } = payload;
  const redisKey = `import:csv:${workspaceId}:${id}`;

  if (mappedLinks.length === 0) {
    console.log("No links to process.");
    return;
  }

  const successfulMappings = mappedLinks.filter(
    (
      result,
    ): result is { success: true; data: NonNullable<MapperResult["data"]> } =>
      result.success && !!result.data,
  );

  // Process the tags
  let selectedTags = successfulMappings
    .map((result) => result.data.tags || [])
    .flat()
    .filter((tag): tag is string => Boolean(tag));

  selectedTags = [...new Set(selectedTags)];

  const tags = await prisma.tag.findMany({
    where: {
      projectId: workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const tagsNotInWorkspace = selectedTags.filter(
    (tag) => !tags.some((t) => t.name.toLowerCase() === tag.toLowerCase()),
  );

  if (tagsNotInWorkspace.length > 0) {
    console.log(`Creating ${tagsNotInWorkspace.length} new tags.`);

    await prisma.tag.createMany({
      data: tagsNotInWorkspace.map((name) => ({
        id: createId({ prefix: "tag_" }),
        projectId: workspaceId,
        name,
        color: randomBadgeColor(),
      })),
      skipDuplicates: true,
    });
  }

  // Process the domains
  let selectedDomains = successfulMappings
    .map((result) => result.data.domain)
    .filter((domain): domain is string => Boolean(domain));

  selectedDomains = [...new Set(selectedDomains)];

  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspaceId,
    },
  });

  const domainsNotInWorkspace = selectedDomains.filter(
    (domain) =>
      !domains.some((d) => d.slug === domain) &&
      !DUB_DOMAINS_ARRAY.includes(domain),
  );

  if (domainsNotInWorkspace.length > 0) {
    console.log(`Creating ${domainsNotInWorkspace.length} new domains.`);

    await Promise.allSettled([
      prisma.domain.createMany({
        data: domainsNotInWorkspace.map((slug) => ({
          id: createId({ prefix: "dom_" }),
          projectId: workspaceId,
          slug,
          primary: false,
        })),
        skipDuplicates: true,
      }),

      domainsNotInWorkspace.map((domain) => addDomainToVercel(domain)),

      domainsNotInWorkspace.map((domain) =>
        createLink({
          ...DEFAULT_LINK_PROPS,
          projectId: workspaceId,
          userId,
          domain,
          key: "_root",
          url: "",
          tags: undefined,
        }),
      ),
    ]);
  }

  if (selectedDomains.length > 0) {
    await redis.sadd(`${redisKey}:domains`, ...selectedDomains);
  }

  // Process the links
  let linksToCreate = successfulMappings.map((result) => result.data);

  const existingLinks = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      shortLink: {
        in: linksToCreate.map((link) => linkConstructorSimple(link)),
      },
    },
    select: {
      shortLink: true,
    },
  });

  console.log(`Skipping ${existingLinks.length} existing links.`);

  linksToCreate = linksToCreate.filter(
    (link) =>
      !existingLinks.some((l) => l.shortLink === linkConstructorSimple(link)),
  );

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      plan: true,
    },
  });

  const processedLinks = await Promise.all(
    linksToCreate.map(({ tags, ...link }) =>
      processLink({
        payload: {
          ...createLinkBodySchema.parse({
            ...link,
            tagNames: tags || [],
            folderId,
          }),
        },
        workspace: {
          id: workspaceId,
          plan: workspace.plan as WorkspaceProps["plan"],
        },
        userId,
        bulk: true,
      }),
    ),
  );

  const validLinks = processedLinks
    .filter(({ error }) => error == null)
    .map(({ link }) => link);

  const errorLinks = processedLinks
    .filter(({ error }) => error != null)
    .map(({ link: { domain, key }, error }) => ({
      domain,
      key,
      error,
    }));

  if (validLinks.length > 0) {
    console.log(`Creating ${validLinks.length} new links.`);

    await bulkCreateLinks({
      links: validLinks as ProcessedLinkProps[],
    });

    await redis.incrby(`${redisKey}:created`, validLinks.length);
  }

  if (errorLinks.length > 0) {
    console.log(`${errorLinks.length} failed to create.`);

    await redis.rpush(`${redisKey}:failed`, ...errorLinks);
  }
};
