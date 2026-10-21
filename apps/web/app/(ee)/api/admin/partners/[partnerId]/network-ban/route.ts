import { unbanPartnerFromNetwork } from "@/lib/api/partners/network-ban";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/admin/partners/[partnerId]/network-ban – unban partner from network
export const DELETE = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        networkStatus: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.networkStatus !== "banned") {
      return new Response("Partner is not banned from the network.", {
        status: 400,
      });
    }

    await unbanPartnerFromNetwork(partnerId);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
