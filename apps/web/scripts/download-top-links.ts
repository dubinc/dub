import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import { linkConstructor } from "./utils";
import { getStats } from "@/lib/stats";

const domain = "xxx";

async function main() {
  const topLinks = await getStats({
    domain,
    endpoint: "top_links",
  });

  const processedLinks = topLinks.map(({ domain, key, clicks }) => ({
    link: linkConstructor({
      domain,
      key,
    }),
    clicks,
  }));

  fs.writeFileSync("xxx.csv", Papa.unparse(processedLinks));
}

main();
