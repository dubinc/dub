import { getPartnerSearchProviderName } from "@/lib/api/partners/search";
import { createUpstashRedisPartnerSearchIndex } from "@/lib/api/partners/search/providers/upstash-redis";
import "dotenv-flow/config";

async function main() {
  const providerName = getPartnerSearchProviderName();
  if (!providerName) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  // Only Redis Search needs an index declared up front. The others infer their
  // schema from the first write, so this is a no-op for them — spelled out per
  // provider rather than falling through, so a new provider cannot silently
  // land on the Redis path.
  if (providerName === "upstash-search" || providerName === "turbopuffer") {
    console.log(
      `${providerName} creates the partner search index on the first backfill upsert.`,
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
