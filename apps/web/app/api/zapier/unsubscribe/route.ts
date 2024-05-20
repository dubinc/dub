import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const subscribeSchema = z.object({
  url: z.string(),
});

export const POST = withWorkspace(async ({ workspace, req }) => {
  const { url: zapierWebhookUrl } = subscribeSchema.parse(
    await parseRequestBody(req),
  );

  await prisma.project.update({
    where: { id: workspace.id },
    data: {
      zapierWebhookUrl,
    },
  });

  console.info(
    `[Zapier] Workspace ${workspace.id} subscribed to ${zapierWebhookUrl}`,
  );

  return NextResponse.json({ status: "OK" });
});
