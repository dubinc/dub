import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/admin/partners/trusted
export const GET = withAdmin(async () => {
  const partners = await prisma.partner.findMany({
    where: {
      networkStatus: "trusted",
    },
    orderBy: {
      trustedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      description: true,
      trustedAt: true,
      platforms: {
        select: {
          type: true,
          identifier: true,
          verifiedAt: true,
          subscribers: true,
          posts: true,
          views: true,
        },
      },
    },
  });

  return NextResponse.json({
    partners: partners.map((partner) => ({
      ...partner,
      platforms: partner.platforms.map((platform) => ({
        ...platform,
        subscribers: Number(platform.subscribers),
        posts: Number(platform.posts),
        views: Number(platform.views),
      })),
    })),
  });
});

// POST /api/admin/partners/trusted
export const POST = withAdmin(
  async ({ req }) => {
    const { partnerIdOrEmail } = z
      .object({
        partnerIdOrEmail: z.string().trim().min(1),
      })
      .parse(await req.json());

    if (
      !partnerIdOrEmail.startsWith("pn_") &&
      !partnerIdOrEmail.includes("@")
    ) {
      return new Response("Invalid partner ID or email.", { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: partnerIdOrEmail.startsWith("pn_")
        ? { id: partnerIdOrEmail }
        : { email: partnerIdOrEmail },
      select: {
        id: true,
        networkStatus: true,
        trustedAt: true,
        changeHistoryLog: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.networkStatus === "banned") {
      return new Response(
        "Partner is banned from the network. Unban them first.",
        { status: 400 },
      );
    }

    if (partner.trustedAt) {
      return new Response("Partner is already marked as trusted.", {
        status: 400,
      });
    }

    const partnerChangeHistoryLog = partner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
      : [];

    const trustedAt = new Date();
    partnerChangeHistoryLog.push({
      field: "networkStatus",
      from: partner.networkStatus,
      to: "trusted",
      changedAt: trustedAt,
    });

    const updatedPartner = await prisma.partner
      .update({
        where: {
          id: partner.id,
          networkStatus: {
            not: "banned",
          },
        },
        data: {
          networkStatus: "trusted",
          trustedAt,
          changeHistoryLog: partnerChangeHistoryLog,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          trustedAt: true,
        },
      })
      .catch((error) => {
        // A ban saved after the read above must not be overwritten
        if (error.code === "P2025") return null;
        throw error;
      });

    if (!updatedPartner) {
      return new Response(
        "Partner is banned from the network. Unban them first.",
        { status: 400 },
      );
    }

    return NextResponse.json(updatedPartner);
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners/trusted
export const DELETE = withAdmin(
  async ({ req }) => {
    const { partnerId } = z
      .object({
        partnerId: z.string().trim().min(1),
      })
      .parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        networkStatus: true,
        trustedAt: true,
        changeHistoryLog: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.networkStatus === "banned") {
      return new Response(
        "Partner is banned from the network. Unban them first.",
        { status: 400 },
      );
    }

    const partnerChangeHistoryLog = partner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
      : [];

    partnerChangeHistoryLog.push({
      field: "networkStatus",
      from: partner.networkStatus,
      to: "approved",
      changedAt: new Date(),
    });

    const updatedPartner = await prisma.partner
      .update({
        where: {
          id: partner.id,
          networkStatus: {
            not: "banned",
          },
        },
        data: {
          networkStatus: "approved",
          trustedAt: null,
          changeHistoryLog: partnerChangeHistoryLog,
        },
      })
      .catch((error) => {
        // A ban saved after the read above must not be overwritten
        if (error.code === "P2025") return null;
        throw error;
      });

    if (!updatedPartner) {
      return new Response(
        "Partner is banned from the network. Unban them first.",
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
