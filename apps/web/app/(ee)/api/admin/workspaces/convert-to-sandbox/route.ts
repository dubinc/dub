import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRIAL_LIMITS } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/admin/workspaces/convert-to-sandbox — convert an existing workspace to sandbox mode.
export const POST = withAdmin(
  async ({ req }) => {
    const { slug } = await req.json();

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json(
        { error: "Workspace slug is required" },
        { status: 400 },
      );
    }

    const workspace = await prisma.project.findUnique({
      where: {
        slug: slug.trim(),
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          environment: WorkspaceEnvironment.sandbox,
          plan: "advanced",
          usageLimit: TRIAL_LIMITS.clicks,
          linksLimit: TRIAL_LIMITS.links,
          domainsLimit: TRIAL_LIMITS.domains,
          aiLimit: TRIAL_LIMITS.ai,
          tagsLimit: TRIAL_LIMITS.tags,
          foldersLimit: TRIAL_LIMITS.folders,
          usersLimit: TRIAL_LIMITS.users,
          partnersLimit: TRIAL_LIMITS.partners,
          payoutsLimit: TRIAL_LIMITS.payouts,
          partnerTagsLimit: TRIAL_LIMITS.partnerTags,
          groupsLimit: TRIAL_LIMITS.groups,
          networkInvitesLimit: TRIAL_LIMITS.networkInvites,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          environment: true,
          plan: true,
        },
      });

      await tx.program.updateMany({
        where: {
          workspaceId: workspace.id,
        },
        data: {
          environment: WorkspaceEnvironment.sandbox,
        },
      });

      return project;
    });

    return NextResponse.json({ success: true, workspace: updated });
  },
  { requiredRoles: ["owner"] },
);
