import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  programEmailsCountQuerySchema,
  programEmailsCountSchema,
  programEmailsGroupedCountSchema,
} from "@/lib/zod/schemas/program-emails";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/emails/count - get email count(s) for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { type, status, groupBy } =
    programEmailsCountQuerySchema.parse(searchParams);

  const where = { programId, ...(type && { type }), ...(status && { status }) };

  if (!groupBy) {
    const count = await prisma.programEmail.count({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(programEmailsCountSchema.parse({ count }));
  }

  const counts = await prisma.programEmail.groupBy({
    by: [groupBy],
    where,
    _count: true,
  });

  return NextResponse.json(
    programEmailsGroupedCountSchema.parse(
      Object.fromEntries(counts.map((c) => [c[groupBy], c._count])),
    ),
  );
});
