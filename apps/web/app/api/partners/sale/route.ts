import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth/workspace";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const PATCH = withWorkspace(async ({ req, workspace, searchParams }) => {
  const { programId, invoiceId } = searchParams;

  const { amount } = await req.json();

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const sale = await prisma.commission.findUnique({
    where: {
      programId_invoiceId: {
        programId: program.id,
        invoiceId,
      },
    },
  });

  if (!sale) {
    throw new DubApiError({
      code: "not_found",
      message: "Sale not found",
    });
  }

  if (sale.status === "paid") {
    throw new DubApiError({
      code: "bad_request",
      message: "Sale already paid",
    });
  }

  const updatedSale = await prisma.commission.update({
    where: {
      id: sale.id,
    },
    data: {
      amount,
    },
  });

  return NextResponse.json(updatedSale);
});
