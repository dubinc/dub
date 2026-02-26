import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../guard";

// POST /api/e2e/partners - Create a partner for E2E testing (minimal setup, no links)
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();
    const { name, email, groupId } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      select: { id: true, defaultGroupId: true },
    });

    const finalGroupId = groupId || program.defaultGroupId;
    if (!finalGroupId) {
      return NextResponse.json(
        { error: "No group ID and program has no default group" },
        { status: 400 },
      );
    }

    const group = await getGroupOrThrow({
      programId,
      groupId: finalGroupId,
      includeExpandedFields: false,
    });

    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId,
        partner: { email },
      },
      include: { partner: true },
    });

    if (existingEnrollment) {
      const enrolledPartner = {
        ...existingEnrollment.partner,
        ...existingEnrollment,
        id: existingEnrollment.partner.id,
        links: [],
      };
      return NextResponse.json(enrolledPartner, { status: 201 });
    }

    let partner = await prisma.partner.findUnique({
      where: { email },
      include: {
        programs: { where: { programId } },
      },
    });

    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          id: createId({ prefix: "pn_" }),
          name: name || email,
          email,
          programs: {
            create: {
              id: createId({ prefix: "pge_" }),
              programId,
              status: "approved",
              groupId: group.id,
              clickRewardId: group.clickRewardId,
              leadRewardId: group.leadRewardId,
              saleRewardId: group.saleRewardId,
              discountId: group.discountId,
            },
          },
        },
        include: {
          programs: { where: { programId } },
        },
      });
    } else {
      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          programId,
          partnerId: partner.id,
          status: "approved",
          groupId: group.id,
          clickRewardId: group.clickRewardId,
          leadRewardId: group.leadRewardId,
          saleRewardId: group.saleRewardId,
          discountId: group.discountId,
        },
      });
      partner = await prisma.partner.findUniqueOrThrow({
        where: { id: partner.id },
        include: {
          programs: { where: { programId } },
        },
      });
    }

    const enrollment = partner!.programs[0];
    if (!enrollment) {
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 500 },
      );
    }
    const enrolledPartner = {
      ...partner,
      ...enrollment,
      id: partner!.id,
      links: [],
    };

    return NextResponse.json(enrolledPartner, { status: 201 });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
