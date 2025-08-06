import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  ProgramEmailSchema,
  programEmailsQuerySchema,
} from "@/lib/zod/schemas/program-emails";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/emails - get all emails for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { type, status, sortBy, sortOrder, page, pageSize } =
    programEmailsQuerySchema.parse(searchParams);

  const emails = await prisma.programEmail.findMany({
    where: {
      programId,
      ...(type && { type }),
      ...(status && { status }),
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return NextResponse.json(z.array(ProgramEmailSchema).parse(emails));
});
