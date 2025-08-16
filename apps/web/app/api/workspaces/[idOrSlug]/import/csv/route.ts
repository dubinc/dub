import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import Papa from "papaparse";

// POST /api/workspaces/[idOrSlug]/import/csv - create job to import links from CSV file
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const formData = await req.formData();

  const file = formData.get("file") as File;
  const folderId = formData.get("folderId") as string | null;

  if (!file) {
    throw new DubApiError({
      code: "bad_request",
      message: "No CSV file was provided.",
    });
  }

  if (folderId) {
    await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId,
      requiredPermission: "folders.links.write",
    });
  }

  const mapping = linkMappingSchema.parse(
    Object.fromEntries(
      Array.from(formData.entries()).filter(
        ([key]) => key !== "file" && key !== "folderId",
      ),
    ) as Record<string, string>,
  );

  const id = crypto.randomUUID();
  const redisKey = `import:csv:${workspace.id}:${id}`;
  const BATCH_SIZE = 1000; // Push 1000 rows to Redis at a time
  let rows: Record<string, string>[] = [];

  // Convert file to text
  const csvText = await file.text();

  // Parse CSV and add rows to Redis
  await new Promise<void>((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      step: async (results) => {
        rows.push(results.data as Record<string, string>);

        if (rows.length >= BATCH_SIZE) {
          try {
            await redis.lpush(`${redisKey}:rows`, ...rows);
            rows = [];
          } catch (error) {
            reject(error);
          }
        }
      },
      complete: () => resolve(),
      error: reject,
    });
  });

  // Add any remaining rows to Redis
  if (rows.length > 0) {
    await redis.lpush(`${redisKey}:rows`, ...rows);
  }

  // Initialize Redis counters
  await Promise.all([
    redis.set(`${redisKey}:created`, "0"),
    redis.set(`${redisKey}:processed`, "0"),
  ]);

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
    body: {
      workspaceId: workspace.id,
      userId: session?.user?.id,
      id,
      folderId,
      mapping,
    },
  });

  return NextResponse.json({});
});
