import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/partners/network
export const GET = withAdmin(async () => {
  const partners = await prisma.partner.findMany({
    where: {
      networkStatus: "submitted",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ partners });
});
