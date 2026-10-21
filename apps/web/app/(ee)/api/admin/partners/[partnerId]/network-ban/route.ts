import {
  banPartnerFromNetwork,
  unbanPartnerFromNetwork,
} from "@/lib/api/partners/network-ban";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getPartnerNetworkStatus(partnerId: string) {
  return prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    select: {
      networkStatus: true,
    },
  });
}

// POST /api/admin/partners/[partnerId]/network-ban – ban partner from network
export const POST = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await getPartnerNetworkStatus(partnerId);

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.networkStatus === "banned") {
      return new Response("Partner is already banned from the network.", {
        status: 400,
      });
    }

    await banPartnerFromNetwork(partnerId);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners/[partnerId]/network-ban – unban partner from network
export const DELETE = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await getPartnerNetworkStatus(partnerId);

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
