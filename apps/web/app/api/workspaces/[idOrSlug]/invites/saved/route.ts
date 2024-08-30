import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import { inviteTeammatesSchema } from "@/lib/zod/schemas/invites";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/invites – get invites for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const invites = (
      await redis.lrange(`invites:${workspace.id}`, 0, -1)
    ).reverse();
    return NextResponse.json(invites);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/invites/saved – save a list of teammate invites
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { teammates } = inviteTeammatesSchema.parse(await req.json());

    if (teammates.length > 10) {
      throw new DubApiError({
        code: "bad_request",
        message: "You can only invite up to 10 teammates at a time.",
      });
    }

    await redis.del(`invites:${workspace.id}`);
    await redis.lpush(`invites:${workspace.id}`, ...teammates);

    return NextResponse.json({ message: "Invite(s) saved" });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
