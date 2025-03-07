import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
import { prisma } from "@dub/prisma";
import { log, normalizeString, parseDateTime } from "@dub/utils";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Readable } from "stream";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  folderId: z.string().nullable(),
  url: z.string(),
  mapping: linkMappingSchema,
});

const importDataSchema = z.object({
  cursor: z.coerce.number().default(0),
  domains: z.array(z.string()).default([]),
  failedLinks: z.array(z.string()).default([]),
  failedCount: z.coerce.number().default(0),
  filesize: z.coerce.number().default(0),
  tagsCache: z.array(z.string()).default([]),
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

const MAX_ROWS_PER_EXECUTION = 5;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const body = JSON.parse(rawBody);
    const { id, url, mapping, workspaceId, userId, folderId } =
      payloadSchema.parse(body);

    if (!id || !url) {
      throw new Error("Missing ID or URL for the import file.");
    }

    const redisKey = `import:csv:${workspaceId}:${id}`;
    const importData = (await redis.hgetall(redisKey)) || {};

    let { cursor, domains, failedLinks, failedCount, filesize, tagsCache } =
      importDataSchema.parse(importData);

    if (cursor === 0) {
      await redis.del(redisKey);
    }

    const response = await storage.fetch(url);

    if (!response || !response.body) {
      throw new Error("CSV import file not found.");
    }

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
    });

    let mappedLinks: MapperResult[] = [];

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
          parser.pause();

          const { data } = chunk;

          if (!data?.length) {
            console.warn("No data in CSV import chunk", chunk.errors);
            parser.resume();
            return;
          }

          mappedLinks = data.map((row) => mapCsvRowToLink(row, mapping));

          const successfulLinks = mappedLinks.filter(
            (
              result,
            ): result is {
              success: true;
              data: NonNullable<MapperResult["data"]>;
            } => result.success && !!result.data,
          );

          const failedLinks = mappedLinks.filter(
            (result): result is { success: false; error: string } =>
              !result.success && !!result.error,
          );

          console.log(
            "successfulLinks",
            successfulLinks.map((l) => l.data.key),
          );

          cursor += data.length;

          await redis.hset(redisKey, {
            cursor,
          });

          parser.resume();
        },
      });
    });

    if (failedLinks.length > 0) {
      const existingFailedLinks = JSON.parse(
        (await redis.hget(redisKey, "failedLinks")) || "[]",
      );

      await redis.hset(redisKey, {
        failedCount:
          parseInt((await redis.hget(redisKey, "failedCount")) || "0") +
          failedLinks.length,
        failedLinks: JSON.stringify([
          ...existingFailedLinks,
          ...failedLinks.map((f) => JSON.stringify(f)),
        ]),
      });
    }

    return NextResponse.json("OK");
  } catch (error) {
    await log({
      message: `Error importing CSV links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

// Map CSV row to link object
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
