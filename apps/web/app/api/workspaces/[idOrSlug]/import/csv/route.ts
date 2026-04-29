import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { redis } from "@/lib/upstash";
import { linkMappingSchema } from "@/lib/zod/schemas/import-csv";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { v4 as uuid } from "uuid";

// POST /api/workspaces/[idOrSlug]/import/csv - create job to import links from CSV file
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
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

    const id = uuid();
    const redisKey = `import:csv:${workspace.id}:${id}`;
    const BATCH_SIZE = 1000; // Push 1000 rows to Redis at a time
    let rows: Record<string, string>[] = [];

    // Convert file to text
    const csvText = await file.text();

    let chain: Promise<unknown> = Promise.resolve();
    let killed = false;

    await new Promise<void>((resolve, reject) => {
      const fail = (error: unknown) => {
        if (killed) return;
        killed = true;
        void (async () => {
          try {
            await redis.del(
              `${redisKey}:rows`,
              `${redisKey}:created`,
              `${redisKey}:processed`,
              `${redisKey}:failed`,
              `${redisKey}:domains`,
            );
          } catch {
            // best-effort: avoid leaving a partial import queue on failure
          }
          reject(error);
        })();
      };

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        step: (results, parser) => {
          if (killed) return;
          rows.push(results.data as Record<string, string>);

          if (rows.length < BATCH_SIZE) return;

          const batch = rows;
          rows = [];
          parser.pause();
          chain = chain
            .then(() => redis.lpush(`${redisKey}:rows`, ...batch))
            .then(() => {
              if (!killed) parser.resume();
            })
            .catch(fail);
        },
        complete: () => {
          void chain
            .then(() => {
              if (killed) return;
              if (rows.length > 0) {
                return redis.lpush(`${redisKey}:rows`, ...rows);
              }
            })
            .then(() => {
              if (!killed) resolve();
            })
            .catch(fail);
        },
        error: fail,
      });
    });

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
  },
  {
    requiredPermissions: ["links.write"],
  },
);
