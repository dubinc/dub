import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners/[partnerId]/programs - get all enrolled programs for a given partnerId
export const GET = withPartner(async ({ partner }) => {
  const programs = await prisma.program.findMany({
    where: {
      partners: {
        some: {
          partnerId: partner.id,
        },
      },
    },
  });

  return NextResponse.json(z.array(ProgramSchema).parse(programs));
});
