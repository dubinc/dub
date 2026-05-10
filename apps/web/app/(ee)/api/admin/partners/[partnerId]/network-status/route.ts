import { withAdmin } from "@/lib/auth";
import { updateAdminNetworkStatusSchema } from "@/lib/zod/schemas/admin";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/admin/partners/[partnerId]/network-status
export const PATCH = withAdmin(
  async ({ params, req }) => {
    const { partnerId } = params;
    const { status } = updateAdminNetworkStatusSchema.parse(await req.json());

    const existingPartner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        networkStatus: true,
        changeHistoryLog: true,
      },
    });

    if (!existingPartner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (existingPartner.networkStatus === status) {
      return new Response("Partner is already in this status.", {
        status: 400,
      });
    }

    if (existingPartner.networkStatus === "trusted" && status === "approved") {
      return new Response("Trusted partners cannot be approved.", {
        status: 400,
      });
    }

    const partnerChangeHistoryLog = existingPartner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(
          existingPartner.changeHistoryLog,
        )
      : [];

    partnerChangeHistoryLog.push({
      field: "networkStatus",
      from: existingPartner.networkStatus,
      to: status,
      changedAt: new Date(),
    });

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        networkStatus: status,
        changeHistoryLog: partnerChangeHistoryLog,
        reviewedAt: new Date(),
      },
      select: {
        id: true,
        networkStatus: true,
      },
    });

    return NextResponse.json(updatedPartner);
  },
  {
    requiredRoles: ["owner"],
  },
);
