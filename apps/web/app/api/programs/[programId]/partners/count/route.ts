import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const schema = z.object({
  groupBy: z.enum(["status", "country"]).optional(),
});

// GET /api/programs/[programId]/partners/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const { groupBy = "status" } = schema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (groupBy === "country") {
      const partners = await prisma.partner.groupBy({
        by: ["country"],
        where: {
          programs: {
            some: {
              programId,
            },
          },
        },
        _count: true,
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });
      console.log({ partners });

      return NextResponse.json(partners);
    } else {
      const programEnrollments = await prisma.programEnrollment.groupBy({
        by: ["status"],
        where: {
          programId,
        },
        _count: true,
      });

      const counts = programEnrollments.reduce(
        (acc, p) => {
          acc[p.status] = p._count;
          return acc;
        },
        {} as Record<ProgramEnrollmentStatus | "all", number>,
      );

      // fill in missing statuses with 0
      Object.values(ProgramEnrollmentStatus).forEach((status) => {
        if (!(status in counts)) {
          counts[status] = 0;
        }
      });

      counts.all = programEnrollments.reduce((acc, p) => acc + p._count, 0);

      return NextResponse.json(counts);
    }
  },
);
