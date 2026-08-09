import {
  createUpstashRedisPartnerSearchIndex,
  getPartnerSearchProviderName,
} from "@/lib/api/partners/search";
import "dotenv-flow/config";

async function main() {
  const providerName = getPartnerSearchProviderName();
  if (!providerName) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  if (providerName === "upstash-search") {
    console.log(
      "Upstash Search creates the partner search index on the first backfill upsert.",
    );
    return;
  }

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
