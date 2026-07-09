import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/partners/[partnerId]/verify-identity
export const POST = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        identityVerifiedAt: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.identityVerifiedAt) {
      return new Response("This partner's identity is already verified.", {
        status: 400,
      });
    }

    await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        identityVerifiedAt: new Date(),
        identityVerificationStatus: "approved",
      },
    });

    return NextResponse.json({
      success: true,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
