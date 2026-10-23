import { searchEmojis } from "@/lib/ai/search-emojis";
import { withSession } from "@/lib/auth";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const emojiSearchSchema = z.object({
  query: z.string().trim().min(2).max(64),
});

// POST /api/ai/emoji-search – semantic emoji matches when name search misses
export const POST = withSession(async ({ req, session }) => {
  const { query } = emojiSearchSchema.parse(await req.json());

  await assertRateLimit({
    policy: RATELIMIT_POLICIES.emojiSearch,
    identifier: session.user.id,
  });

  const emojis = await searchEmojis(query);

  return NextResponse.json({ emojis });
});
