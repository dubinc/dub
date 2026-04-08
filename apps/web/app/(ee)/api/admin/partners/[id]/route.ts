import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/partners/[id]
export const GET = withAdmin(async ({ params }) => {
  const { id } = params;

  const partner = await prisma.partner.findUnique({
    where: {
      id,
    },
    include: {
      platforms: true,
    },
  });

  if (!partner) {
    return new Response("Partner not found.", { status: 404 });
  }

  const [programEnrollments, fraudAlerts, payouts, commissions] =
    await Promise.all([
      prisma.programEnrollment.findMany({
        where: {
          partnerId: id,
          status: "banned",
        },
        include: {
          program: true,
        },
        orderBy: {
          bannedAt: "desc",
        },
      }),

      prisma.fraudAlert.findMany({
        where: {
          partnerId: id,
        },
        include: {
          program: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.payout.findMany({
        where: {
          partnerId: id,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.commission.findMany({
        where: {
          partnerId: id,
        },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              country: true,
            },
          },
          link: {
            select: {
              id: true,
              domain: true,
              key: true,
              shortLink: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  return NextResponse.json({
    ...partner,
    platforms: partner.platforms.map((p) => ({
      ...p,
      subscribers: p.subscribers ? Number(p.subscribers) : null,
    })),
    programEnrollments,
    fraudAlerts,
    payouts,
    commissions,
  });
});
