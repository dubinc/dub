/**
 * Empties a partner search namespace.
 *
 * Takes the namespace explicitly rather than reading the one the code writes to,
 * so retiring an old version after a migration is possible — and requires it
 * twice, because this is not recoverable without a backfill.
 *
 *   cd apps/web
 *   pnpm run script partners/delete-partner-search-index
 *     --indexName=partner-search-v2 --confirm=partner-search-v2
 *
 * Requires TURBOPUFFER_API_KEY.
 */

import { deleteTurbopufferPartnerSearchNamespace } from "@/lib/api/partners/search/providers/turbopuffer";
import "dotenv-flow/config";

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

async function main() {
  const { indexName } = parseArguments(process.argv.slice(2));

  if (!process.env.TURBOPUFFER_API_KEY?.trim()) {
    throw new Error("TURBOPUFFER_API_KEY is not configured.");
  }

  await deleteTurbopufferPartnerSearchNamespace({ namespaceName: indexName });

  console.log(`Partner search cleanup complete: emptied ${indexName}.`);
}

main().catch((error) => {
  console.error("Failed to delete partner search index:", error);
  process.exitCode = 1;
});
