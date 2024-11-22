import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createOrRetrieveEmbedToken } from "@/lib/referrals/create-or-retrieve-embed-token";
import {
  createReferralTokenSchema,
  referralTokenSchema,
} from "@/lib/zod/schemas/referrals";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given link
export const POST = withWorkspace(async ({ workspace, req }) => {
  const { linkId } = createReferralTokenSchema.parse(
    await parseRequestBody(req),
  );
  await getLinkOrThrow({ linkId, workspaceId: workspace.id });

  const token = await createOrRetrieveEmbedToken(linkId);

  return NextResponse.json(referralTokenSchema.parse(token), {
    status: 201,
  });
});
