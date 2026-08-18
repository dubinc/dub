import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { assertE2EWorkspace } from "../guard";

const bodySchema = z.object({
  partnerId: z.string(),
  createdAt: z.string().optional(),
  // Set Link.leads on the partner's first program link (used by send-campaign AND conditions)
  leads: z.number().int().min(0).optional(),
  // Create a User + PartnerUser from the partner email so campaign emails have a recipient
  createUser: z.boolean().optional(),
});

// PATCH /api/e2e/enrollments - Update enrollment (e.g., backdate createdAt)
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerId, createdAt, leads, createUser } = bodySchema.parse(
      await parseRequestBody(req),
    );

    if (createUser) {
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { email: true, name: true },
      });

      if (partner?.email) {
        const user = await prisma.user.create({
          data: {
            id: createId({ prefix: "user_" }),
            email: partner.email,
            name: partner.name,
            emailVerified: new Date(),
            defaultPartnerId: partnerId,
          },
        });

        await prisma.partnerUser.create({
          data: {
            userId: user.id,
            partnerId,
            role: "owner",
            notificationPreferences: {
              create: {},
            },
          },
        });
      }
    }

    if (typeof leads === "number") {
      const link = await prisma.link.findFirst({
        where: {
          partnerId,
          programId,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
        },
      });

      if (link) {
        await prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            leads,
          },
        });
      }
    }

    const enrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      data: {
        ...(createdAt && { createdAt: new Date(createdAt) }),
        ...(typeof leads === "number" && { totalLeads: leads }),
      },
      select: {
        partnerId: true,
        programId: true,
        createdAt: true,
        totalLeads: true,
      },
    });

    return NextResponse.json(enrollment);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
