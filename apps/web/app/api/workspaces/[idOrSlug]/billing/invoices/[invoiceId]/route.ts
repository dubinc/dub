import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// TODO: move to GET /invoices/[invoiceId]
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { invoiceId } = params;

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: {
        id: invoiceId,
        workspaceId: workspace.id,
      },
      include: {
        _count: {
          select: {
            payouts: true,
          },
        },
      },
    });

    return NextResponse.json(invoice);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
