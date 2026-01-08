import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { chunk, getParamsFromURL, linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let linksToRestore: Prisma.LinkCreateManyInput[] = [];
let linkTagsToRestore: Prisma.LinkTagCreateManyInput[] = [];

async function main() {
  Papa.parse(fs.createReadStream("deleted_links.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        link_id: string;
        domain: string;
        key: string;
        url: string;
        tag_ids: string;
        workspace_id: string;
        created_at: string;
        program_id: string;
        partner_id: string;
        folder_id: string;
      };
    }) => {
      const userId = "user_xxx";
      if (!userId) {
        throw new Error("No user id found for link");
      }
      const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
        getParamsFromURL(result.data.url);
      const tagIds: string[] = result.data.tag_ids
        ? JSON.parse(result.data.tag_ids.replace(/'/g, '"'))
        : [];

      linksToRestore.push({
        id: result.data.link_id,
        domain: result.data.domain,
        key: result.data.key,
        url: result.data.url,
        shortLink: linkConstructorSimple({
          domain: result.data.domain,
          key: result.data.key,
        }),
        projectId: result.data.workspace_id,
        createdAt: new Date(result.data.created_at),
        programId: result.data.program_id || null,
        partnerId: result.data.partner_id || null,
        folderId: result.data.folder_id || null,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        userId,
        trackConversion: true,
      });

      if (tagIds.length > 0) {
        tagIds.forEach((tagId) => {
          linkTagsToRestore.push({
            linkId: result.data.link_id,
            tagId,
          });
        });
      }
    },
    complete: async () => {
      console.log(`Found ${linksToRestore.length} links to restore`);

      const chunks = chunk(linksToRestore, 500);
      for (const chunk of chunks) {
        const res = await prisma.link.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        console.log(`Created ${res.count} links (out of ${chunk.length})`);
      }

      const linkTagsChunks = chunk(linkTagsToRestore, 500);
      for (const chunk of linkTagsChunks) {
        const res = await prisma.linkTag.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        console.log(`Created ${res.count} link tags (out of ${chunk.length})`);
      }
    },
  });
}

main();
