import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { bulkCreateLinks } from "../lib/api/links/bulk-create-links";

const links: any[] = [];

async function main() {
  Papa.parse(fs.createReadStream("xxx.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: any }) => {
      const shortLink = result.data["Short link"];
      links.push({
        domain: shortLink.split("/")[0],
        key: shortLink.split("/")[1],
        url: result.data["Destination URL"],
        projectId: "xxx",
        userId: "xxx",
      });
    },
    complete: async () => {
      const chunks = chunk(links, 500);
      for (const chunk of chunks) {
        await bulkCreateLinks({ links: chunk });
        console.log(`Created ${chunk.length} of ${links.length} links`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    },
  });
}

main();
