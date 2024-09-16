import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const schema = z.object({
  domain: z
    .string()
    .min(1)
    .endsWith(".link")
    .transform((domain) => domain.toLowerCase())
    .describe("We only support .link domains for now."),
});

// POST /api/domains/saved - save a domain for future registration (e.g. after onboarding)
export const POST = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const { domain } = schema.parse(searchParams);

    await redis.set(
      `onboarding-domain:${workspace.id}`,
      { domain, userId: session.user.id },
      {
        ex: 60 * 60 * 24 * 15, // 15 days
      },
    );

    return NextResponse.json({ success: true });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
