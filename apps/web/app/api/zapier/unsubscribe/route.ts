import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const unsubscribeSchema = z.object({
  id: z.string(),
});

// POST /api/zapier/unsubscribe - Unsubscribe from a Zapier hook
export const POST = withWorkspace(async ({ workspace, req }) => {
  const { id } = unsubscribeSchema.parse(await parseRequestBody(req));

  const hook = await prisma.zapierHook.delete({
    where: {
      projectId: workspace.id,
      id,
    },
  });

  // Check if there are any hooks left for the workspace
  const hooks = await prisma.zapierHook.count({
    where: {
      projectId: workspace.id,
    },
  });

  if (hooks === 0) {
    await prisma.project.update({
      where: { id: workspace.id },
      data: { zapierHookEnabled: false },
    });
  }

  console.info(`[Zapier] Workspace ${workspace.id} unsubscribed from ${hook}`);

  return NextResponse.json({ status: "OK" });
});
