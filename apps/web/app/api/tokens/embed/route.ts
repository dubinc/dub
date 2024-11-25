import { DubApiError } from "@/lib/api/errors";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/referrals/embed-token";
import { ratelimit } from "@/lib/upstash";
import {
  createEmbedTokenSchema,
  embedTokenSchema,
} from "@/lib/zod/schemas/token";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given link
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const { linkId } = createEmbedTokenSchema.parse(
      await parseRequestBody(req),
    );

    await getLinkOrThrow({ linkId, workspaceId: workspace.id });

    // TODO:
    // Need to reconsider this rate limit.

    const { success } = await ratelimit(10, "1 h").limit(linkId);

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "Too many requests. You can only generate 10 tokens per hour per link.",
      });
    }

    const response = await embedToken.create(linkId);

    console.log("response", response);

    return NextResponse.json(embedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredAddOn: "conversion",
  },
);
