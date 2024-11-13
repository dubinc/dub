import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { DOTS_DEFAULT_APP_ID } from "@/lib/dots/env";
import { dotsFetch } from "@/lib/dots/fetch";
import { payoutMethodSchema } from "@/lib/dots/schemas";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/partners/[partnerId] - get a partner by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId, partnerId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: true,
    },
  });

  const partner = programEnrollment.partner;

  // if there is still no dots ID
  if (!partner.dotsUserId) {
    return NextResponse.json([]);
  }

  const [info, payoutMethods] = await Promise.all([
    dotsFetch(`/users/${partner.dotsUserId}`, {
      method: "GET",
      dotsAppId: DOTS_DEFAULT_APP_ID,
    }),
    dotsFetch(`/users/${partner.dotsUserId}/payout-methods`, {
      method: "GET",
      dotsAppId: DOTS_DEFAULT_APP_ID,
    }),
  ]);

  return NextResponse.json(
    z.array(payoutMethodSchema).parse(
      payoutMethods
        .map((method) => ({
          ...method,
          default: info.default_payout_method === method.platform,
        }))
        .sort((a, b) => (a.default ? -1 : b.default ? 1 : 0)),
    ),
  );
});
