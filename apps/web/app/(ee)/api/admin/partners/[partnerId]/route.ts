import { withAdmin } from "@/lib/auth";
import { updatePartnerCountry } from "@/lib/partners/update-partner-country";
import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/admin/partners/[partnerId]
export const GET = withAdmin(async ({ params }) => {
  const { partnerId } = params;

  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
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
        partnerId,
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
        partnerId,
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
        partnerId,
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

const adminUpdatePartnerSchema = z.object({
  country: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]),
});

// PATCH /api/admin/partners/[partnerId] – update the partner country
export const PATCH = withAdmin(async ({ params, req }) => {
  const { partnerId } = params;
  const { country } = adminUpdatePartnerSchema.parse(await req.json());

  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      country: true,
    },
  });

  if (!partner) {
    return new Response("Partner not found.", { status: 404 });
  }

  if (partner.country === country) {
    return new Response("Partner is already in this country.", { status: 400 });
  }

  try {
    await updatePartnerCountry({
      partnerId: partner.id,
      country,
      isAdmin: true,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Failed to update country.",
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
});
