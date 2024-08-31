import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import { Invite, inviteTeammatesSchema } from "@/lib/zod/schemas/invites";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/invites – get invites for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const invites = (
      (await redis.get<Invite[]>(`invites:${workspace.id}`)) ?? []
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

    if (teammates.length > 4) {
      throw new DubApiError({
        code: "bad_request",
        message: "You can only save up to 4 teammate invitations at a time.",
      });
    }

    await redis.set(`invites:${workspace.id}`, teammates, {
      ex: 60 * 60 * 24 * 15, // 15 days
    });

    return NextResponse.json({ message: "Invite(s) saved" });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
