import { DubApiError } from "@/lib/api/errors";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { withSession } from "@/lib/auth/session";
import { getPlatformFromSocialUrl } from "@/lib/bounty/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const inputSchema = z.object({
  url: z.string(),
});

// GET /api/social-content-stats - get content stats for a social media url
export const GET = withSession(async ({ searchParams, session }) => {
  const { url } = inputSchema.parse(searchParams);

  const platform = getPlatformFromSocialUrl(url);

  if (!platform) {
    throw new DubApiError({
      code: "bad_request",
      message: "Unsupported or invalid URL for social content.",
    });
  }

  const content = await getSocialContent({
    platform,
    url,
  });

  return NextResponse.json(content);
});
