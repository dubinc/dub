import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const subscribeSchema = z.object({
  url: z.string(),
});

const unsubscribeSchema = z.object({
  id: z.string(),
});

// GET /api/zapier/subscribe - Subscribe to a Zapier hook
export const POST = withWorkspace(async ({ workspace, req }) => {
  const { url } = subscribeSchema.parse(await parseRequestBody(req));

  // Create a new Zapier hook for the workspace
  const hook = await prisma.zapierHook.create({
    data: {
      projectId: workspace.id,
      url,
    },
  });

  if (!workspace.zapierHookEnabled) {
    await prisma.project.update({
      where: { id: workspace.id },
      data: { zapierHookEnabled: true },
    });
  }

  console.info(`[Zapier] Workspace ${workspace.id} subscribed to ${hook}`);

  return NextResponse.json({ id: hook.id }, { status: 201 });
});

// DELETE /api/zapier/unsubscribe - Unsubscribe from a Zapier hook
export const DELETE = withWorkspace(async ({ workspace, searchParams }) => {
  const { id } = unsubscribeSchema.parse(searchParams);

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
