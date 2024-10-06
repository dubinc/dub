import { dub } from "@/lib/dub";
import "dotenv-flow/config";

async function main() {
  const data = await dub.analytics.retrieve({
    domain: "dub.link",
    event: "clicks",
    groupBy: "trigger",
  });
  console.log({ data });
}

main();
