import { withAdmin } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, COUNTRIES } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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
      changeHistoryLog: true,
      veriffSessionId: true,
    },
  });

  if (!partner) {
    return new Response("Partner not found.", { status: 404 });
  }

  if (partner.country === country) {
    return new Response("Partner is already in this country.", { status: 400 });
  }

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  partnerChangeHistoryLog.push({
    field: "country",
    from: partner.country,
    to: country,
    changedAt: new Date(),
  });

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      country,
      stripeConnectId: null, // reset stripe connect account
      payoutsEnabledAt: null,
      defaultPayoutMethod: null,
      payoutMethodHash: null,
      changeHistoryLog: partnerChangeHistoryLog,
    },
  });

  // if there was an existing veriff session, trigger a country change verification
  if (partner.veriffSessionId) {
    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/verify-country-change`,
        body: {
          partnerId: partner.id,
        },
      }),
    );
  }

  return NextResponse.json({ success: true });
});
