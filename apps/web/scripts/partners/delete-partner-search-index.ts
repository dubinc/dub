import { getPartnerSearchProviderName } from "@/lib/api/partners/search";
import { deleteUpstashSearchPartnerSearchIndex } from "@/lib/api/partners/search/providers/upstash-search";
import { chunk } from "@dub/utils";
import { Redis } from "@upstash/redis";
import "dotenv-flow/config";

const DELETE_BATCH_SIZE = 1_000;
const SCAN_COUNT = 10_000;
const MAX_DELETE_PASSES = 3;

interface DeletePartnerSearchIndexArguments {
  indexName: string;
}

function parseArguments(args: string[]): DeletePartnerSearchIndexArguments {
  let indexName: string | undefined;
  let confirm: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--indexName=")) {
      indexName = arg.slice("--indexName=".length);
    } else if (arg.startsWith("--confirm=")) {
      confirm = arg.slice("--confirm=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!indexName || !/^[a-zA-Z0-9_-]{1,100}$/.test(indexName)) {
    throw new Error(
      "--indexName must contain 1-100 letters, numbers, underscores, or hyphens.",
    );
  }

  if (confirm !== indexName) {
    throw new Error(`Pass --confirm=${indexName} to confirm deletion.`);
  }

  return { indexName };
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.",
    );
  }

  return new Redis({ url, token });
}

async function deleteDocumentPass(redis: Redis, documentPattern: string) {
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: documentPattern,
      count: SCAN_COUNT,
    });

    for (const keyBatch of chunk(keys, DELETE_BATCH_SIZE)) {
      deleted += await redis.del(...keyBatch);
    }

    cursor = nextCursor;
  } while (cursor !== "0");

  return deleted;
}

async function deleteDocuments(redis: Redis, indexName: string) {
  const documentPattern = `${indexName}:partner:*`;
  let totalDeleted = 0;

  // Repeat the scan to verify that no matching keys remain after deletion
  for (let pass = 1; pass <= MAX_DELETE_PASSES; pass++) {
    const deleted = await deleteDocumentPass(redis, documentPattern);
    totalDeleted += deleted;

    console.log(
      `Deletion pass ${pass}: ${deleted.toLocaleString()} documents removed`,
    );

    if (deleted === 0) {
      return totalDeleted;
    }
  }

  throw new Error(
    `Documents matching ${documentPattern} are still being created. Stop application processes using this index and run the script again.`,
  );
}

async function main() {
  const { indexName } = parseArguments(process.argv.slice(2));
  const providerName = getPartnerSearchProviderName();
  if (!providerName) {
    throw new Error("PARTNER_SEARCH_PROVIDER is not configured.");
  }

  if (providerName === "upstash-search") {
    const { documentCount } = await deleteUpstashSearchPartnerSearchIndex({
      indexName,
    });
    console.log(
      `Partner search cleanup complete: ${documentCount.toLocaleString()} documents removed from ${indexName}.`,
    );
    return;
  }

  const redis = createRedisClient();
  const index = redis.search.index({ name: indexName });
  const description = await index.describe();
  const expectedPrefix = `${indexName}:partner:`;

  // Verify that the index contains only partner search documents
  if (!description) {
    console.warn(
      `Index ${indexName} does not exist, so its prefix cannot be verified. Removing any documents left under ${expectedPrefix} only.`,
    );
  } else if (
    description.prefixes.length !== 1 ||
    description.prefixes[0] !== expectedPrefix
  ) {
    throw new Error(
      `Index ${indexName} does not use an expected partner search prefix.`,
    );
  }

  // Drop the search index without affecting unrelated Redis data
  const dropped = await index.drop();
  console.log(
    dropped === 1
      ? `Dropped partner search index ${indexName}`
      : `Partner search index ${indexName} did not exist`,
  );

  // Step 3: Delete the partner documents stored for this index
  const deleted = await deleteDocuments(redis, indexName);
  console.log(
    `Partner search cleanup complete: ${deleted.toLocaleString()} documents removed.`,
  );
}

main().catch((error) => {
  console.error("Failed to delete partner search index:", error);
  process.exitCode = 1;
});
