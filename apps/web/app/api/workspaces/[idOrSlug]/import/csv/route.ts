import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const linkMappingSchema = z.object({
  domain: z.string(),
  url: z.string(),
  key: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/workspaces/[idOrSlug]/import/csv - create job to import links from CSV file
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const formData = await req.formData();
  const id = formData.get("id") as string;
  const mapping = linkMappingSchema.parse(
    Object.fromEntries(
      Array.from(formData.entries()).filter(([key]) => key !== "id"),
    ) as Record<string, string>,
  );

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
    body: {
      workspaceId: workspace.id,
      userId: session?.user?.id,
      url: `workspaces/${workspace.id}/import/csv/${id}.csv`,
      mapping,
    },
  });

  return NextResponse.json({});
});
