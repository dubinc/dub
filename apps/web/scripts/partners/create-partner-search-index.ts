import { createUpstashRedisPartnerSearchIndex } from "@/lib/api/partners/search";
import "dotenv-flow/config";

async function main() {
  const index = await createUpstashRedisPartnerSearchIndex();
  const description = await index.describe();

  if (!description) {
    throw new Error("Partner search index was not created.");
  }

  console.log(`Partner search index is ready: ${description.name}`);
  console.log(`Document prefix: ${description.prefixes.join(", ")}`);
}

main().catch((error) => {
  console.error("Failed to create partner search index:", error);
  process.exit(1);
});
