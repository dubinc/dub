import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/admin/partners
export const GET = withAdmin(async () => {
  const partners = await prisma.partner.findMany({
    where: {
      trustedAt: {
        not: null,
      },
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

// POST /api/admin/partners
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
        trustedAt: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.trustedAt) {
      return new Response("Partner is already marked as trusted.", {
        status: 400,
      });
    }

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        trustedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        trustedAt: true,
      },
    });

    return NextResponse.json(updatedPartner);
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners — clears trusted status (removes from trusted list)
export const DELETE = withAdmin(
  async ({ req }) => {
    const { partnerId } = z
      .object({
        partnerId: z.string().trim().min(1),
      })
      .parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, trustedAt: true },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    await prisma.partner.update({
      where: { id: partner.id },
      data: { trustedAt: null },
    });

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
