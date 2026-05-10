import { withAdmin } from "@/lib/auth";
import { updateAdminNetworkStatusSchema } from "@/lib/zod/schemas/admin";
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
      },
    });

    if (!existingPartner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (existingPartner.networkStatus !== "submitted") {
      return new Response("Partner has already been reviewed.", { status: 400 });
    }

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        networkStatus: status,
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
