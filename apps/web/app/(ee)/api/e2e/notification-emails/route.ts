import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../guard";

// GET /api/e2e/notification-emails - Find notification emails
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  assertE2EWorkspace(workspace);

  const { campaignId, partnerId } = searchParams;

  const emails = await prisma.notificationEmail.findMany({
    where: {
      ...(campaignId && { campaignId }),
      ...(partnerId && { partnerId }),
      type: "Campaign",
    },
  });

  return NextResponse.json(emails);
});

// POST /api/e2e/notification-emails - Create a notification email (for test setup)
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();

    const email = await prisma.notificationEmail.create({
      data: {
        id: createId({ prefix: "em_" }),
        type: "Campaign",
        emailId: body.emailId || `e2e_${Date.now()}`,
        campaignId: body.campaignId,
        programId,
        partnerId: body.partnerId,
        recipientUserId: body.recipientUserId,
      },
    });

    return NextResponse.json(email);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);

// DELETE /api/e2e/notification-emails - Delete notification emails (cleanup)
export const DELETE = withWorkspace(
  async ({ workspace, searchParams }) => {
    assertE2EWorkspace(workspace);

    const { campaignId } = searchParams;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    const result = await prisma.notificationEmail.deleteMany({
      where: {
        campaignId,
        type: "Campaign",
      },
    });

    return NextResponse.json({ deleted: result.count });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
