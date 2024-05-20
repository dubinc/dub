import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const subscribeSchema = z.object({
  url: z.string(),
});

export const POST = withWorkspace(async ({ workspace, req }) => {
  const { url } = subscribeSchema.parse(await parseRequestBody(req));

  await prisma.zapierHook.create({
    data: {
      projectId: workspace.id,
      url,
    },
  });

  console.info(`[Zapier] Workspace ${workspace.id} subscribed to ${url}`);

  return NextResponse.json({ status: "OK" });
});
