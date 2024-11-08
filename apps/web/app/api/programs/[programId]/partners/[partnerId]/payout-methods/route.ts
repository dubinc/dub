import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { DOTS_API_URL } from "@/lib/dots/env";
import { payoutMethodSchema } from "@/lib/dots/schemas";
import { dotsHeaders } from "@/lib/dots/utils";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
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

  // if there  is still no dots ID
  if (!partner.dotsUserId) {
    return NextResponse.json([]);
  }

  const [info, payoutMethods] = await Promise.all([
    fetch(`${DOTS_API_URL}/users/${partner.dotsUserId}`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
    fetch(`${DOTS_API_URL}/users/${partner.dotsUserId}/payout-methods`, {
      method: "GET",
      headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    }).then((res) => res.json()),
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
