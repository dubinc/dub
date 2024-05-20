import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const unsubscribeSchema = z.object({
  id: z.string(),
});

export const POST = withWorkspace(async ({ workspace, req }) => {
  const { id } = unsubscribeSchema.parse(await parseRequestBody(req));

  const hook = await prisma.zapierHook.delete({
    where: {
      projectId: workspace.id,
      id,
    },
  });

  console.info(`[Zapier] Workspace ${workspace.id} unsubscribed from ${hook}`);

  return NextResponse.json({ status: "OK" });
});
