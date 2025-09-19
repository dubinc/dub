import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { bulkCreateLinks } from "../lib/api/links/bulk-create-links";

const links: any[] = [];

async function main() {
  Papa.parse(fs.createReadStream("links.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: any }) => {
      const urlObj = new URL(result.data["Short link"]);
      links.push({
        domain: urlObj.hostname,
        key: urlObj.pathname.slice(1),
        url: result.data["Destination URL"],
        createdAt: new Date(result.data["Creation date"]),
        projectId: "ws_xxx",
        userId: "user_xxx",
      });
    },
    complete: async () => {
      const chunks = chunk(links, 500);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await bulkCreateLinks({ links: chunk, skipRedisCache: true });
        console.log(
          `Created ${chunk.length * (i + 1)} of ${links.length} links, remaining: ${
            links.length - chunk.length * (i + 1)
          }`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.log(`Imported ${links.length} links`);
    },
  });
}

main();
