import z from "@/lib/zod";
import { bulkCreateLinksBodySchema } from "@/lib/zod/schemas/links";
import { Client } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

// Initiate Redis instance by connecting to REST URL
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

const projectId = "xxx";
const userId = "xxx";
const domain = "xxx";
const links: z.infer<typeof bulkCreateLinksBodySchema> = [];

async function main() {
  Papa.parse(fs.createReadStream("short_urls.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        createdAt: string;
        domain: string;
        shortCode: string;
        longUrl: string;
        title: string;
        tags: string;
      };
    }) => {
      const { createdAt, domain, shortCode, longUrl, title, tags } =
        result.data;

      links.push({
        domain,
        key: shortCode,
        url: longUrl,
        title,
        // @ts-ignore
        createdAt,
        tagNames: tags.split("|"),
      });
    },
    complete: async () => {
      // const tags = links.flatMap((link) => link.tagNames).filter(Boolean);
      // const uniqueTags = Array.from(new Set(tags));
      // await prisma.tag.createMany({
      //   data: uniqueTags.map((name) => ({
      //     name,
      //     color: randomBadgeColor(),
      //     projectId,
      //   })),
      //   skipDuplicates: true,
      // });

      // deduplicate links with same domain and key
      const processedLinks = links.reduce((acc: typeof links, link) => {
        const existingLink = acc.find(
          (l) => l.domain === link.domain && l.key === link.key,
        );

        if (existingLink) {
          // @ts-ignore combine tags
          existingLink?.tagNames.push(...link.tagNames);
        } else {
          acc.push(link);
        }

        return acc;
      }, []);

      console.table(processedLinks, ["domain", "key", "tagNames"]);

      await redis.lpush(`import:csv:${projectId}`, ...processedLinks);

      await qstash.publishJSON({
        url: `https://rich-easily-kingfish.ngrok-free.app/api/cron/import/csv`,
        body: {
          workspaceId: projectId,
          userId,
          domain,
        },
      });
    },
  });
}

main();
