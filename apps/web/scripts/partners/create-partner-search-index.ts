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

  // createUpstashRedisPartnerSearchIndex already described and validated the
  // index, so reuse that rather than describing it a second time.
  const { description } = await createUpstashRedisPartnerSearchIndex();

  console.log(`Partner search index is ready: ${description.name}`);
  console.log(`Document prefix: ${description.prefixes.join(", ")}`);
}

main().catch((error) => {
  console.error("Failed to create partner search index:", error);
  process.exitCode = 1;
});
