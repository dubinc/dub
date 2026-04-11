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
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      country: true,
      companyName: true,
      createdAt: true,
      platforms: true,
    },
  });

  if (!partner) {
    return new Response("Partner not found.", { status: 404 });
  }

  const [programEnrollments, fraudAlerts, payouts] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: {
        partnerId: id,
        status: "banned",
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
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
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.payout.findMany({
      where: {
        partnerId: id,
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
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
  });
});
