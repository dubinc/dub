import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createFlowSchema = z.object({
  affiliateId: z.string(),
});

// POST /api/affiliates/flows – create a flow for an affiliate
export const POST = withWorkspace(
  async ({ req }) => {
    const { affiliateId } = createFlowSchema.parse(await parseRequestBody(req));

    const affiliate = await prisma.affiliate.findUnique({
      where: {
        id: affiliateId,
      },
    });

    //   // TODO: Fix this
    // if (!affiliate?.dotsUserId) {
    //   throw new Error("Dots user ID not found");
    // }

    const response = await createDotsFlow({
      dotsUserId: "cfa56465-b1a8-45d1-bf82-fa8d90ea6175",
    });

    return NextResponse.json(response);
  },
  {
    // requiredAddOn: "conversion",
    // requiredPermissions: ["conversions.write"],
  },
);
