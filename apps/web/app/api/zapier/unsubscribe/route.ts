import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const unsubscribeSchema = z.object({
  url: z.string(),
});

export const POST = withWorkspace(async ({ workspace, req }) => {
  const { url } = unsubscribeSchema.parse(await parseRequestBody(req));

  await prisma.zapierHook.delete({
    where: {
      projectId: workspace.id,
      url,
    },
  });

  console.info(`[Zapier] Workspace ${workspace.id} unsubscribed from ${url}`);

  return NextResponse.json({ status: "OK" });
});
