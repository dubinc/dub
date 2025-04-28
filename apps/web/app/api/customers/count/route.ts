import { withWorkspace } from "@/lib/auth";
import { getCustomersCountQuerySchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { email, externalId, search } =
    getCustomersCountQuerySchema.parse(searchParams);

  const count = await prisma.customer.count({
    where: {
      projectId: workspace.id,
      ...(email
        ? { email }
        : externalId
          ? { externalId }
          : search
            ? {
                OR: [
                  { email: { startsWith: search } },
                  { externalId: { startsWith: search } },
                  { name: { startsWith: search } },
                ],
              }
            : {}),
    },
  });

  return NextResponse.json(count);
});
