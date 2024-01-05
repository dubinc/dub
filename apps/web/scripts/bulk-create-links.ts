import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import { redis } from "./utils";
import { qstash } from "@/lib/cron";

const projectId = "xxx";
const userId = "xxx";
const domain = "xxx";
const links: { domain: string; url: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("links_com_domain.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { Link: string } }) => {
      links.push({
        domain,
        url: result.data.Link,
      });
    },
    complete: async () => {
      await redis.lpush(`import:csv:${projectId}`, ...links);

      await qstash.publishJSON({
        url: `https://app.dub.co/api/cron/import/csv`,
        body: {
          projectId,
          userId,
          domain,
        },
      });
    },
  });
}

main();
