import { prisma } from "@/lib/prisma";
import { getPreferredStagingSlug } from "@/lib/sandbox/staging-slug";
import { Project } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const syncStagingWorkspaceJobSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add-member"),
    workspaceId: z.string(),
    userId: z.string(),
  }),
  z.object({
    action: z.literal("update-member-role"),
    workspaceId: z.string(),
    userId: z.string(),
  }),
  z.object({
    action: z.literal("remove-member"),
    workspaceId: z.string(),
    userId: z.string(),
  }),
  z.object({
    action: z.literal("sync-workspace"),
    workspaceId: z.string(),
  }),
]);

type ProductionWorkspace = Pick<
  Project,
  | "id"
  | "stagingWorkspaceId"
  | "name"
  | "slug"
  | "logo"
  | "plan"
  | "planTier"
  | "planPeriod"
  | "stagingWorkspaceId"
>;

export const syncStagingWorkspaceJob = defineJob({
  name: "sync-staging-workspace-job",
  schema: syncStagingWorkspaceJobSchema,
  defaults: {
    retries: 3,
  },
  async handle(payload) {
    const workspace = await prisma.project.findUnique({
      where: {
        id: payload.workspaceId,
      },
      select: {
        id: true,
        stagingWorkspaceId: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
        planTier: true,
        planPeriod: true,
      },
    });

    if (!workspace?.stagingWorkspaceId) {
      return;
    }

    switch (payload.action) {
      case "add-member":
      case "update-member-role":
      case "remove-member":
        await syncMember({
          workspace,
          userId: payload.userId,
        });
        break;

      case "sync-workspace":
        await syncWorkspace({ workspace });
        break;
    }
  },
});

async function syncMember({
  workspace,
  userId,
}: {
  workspace: ProductionWorkspace;
  userId: string;
}) {
  if (!workspace.stagingWorkspaceId) {
    return;
  }

  const member = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: workspace.id,
      },
    },
    select: {
      role: true,
      user: {
        select: {
          isMachine: true,
        },
      },
    },
  });

  // We don't sync the machine user from the production workspace to the staging workspace
  if (member?.user.isMachine) {
    return;
  }

  if (member) {
    await prisma.projectUsers.upsert({
      where: {
        userId_projectId: {
          userId,
          projectId: workspace.stagingWorkspaceId,
        },
      },
      create: {
        projectId: workspace.stagingWorkspaceId,
        userId,
        role: member.role,
        notificationPreference: {
          create: {},
        },
      },
      update: {
        role: member.role,
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      isMachine: true,
    },
  });

  if (!user || user.isMachine) {
    return;
  }

  await Promise.all([
    prisma.projectUsers.deleteMany({
      where: {
        userId,
        projectId: workspace.stagingWorkspaceId,
      },
    }),

    prisma.restrictedToken.deleteMany({
      where: {
        projectId: workspace.stagingWorkspaceId,
        userId,
      },
    }),
  ]);
}

async function syncWorkspace({
  workspace,
}: {
  workspace: ProductionWorkspace;
}) {
  if (!workspace.stagingWorkspaceId) {
    return;
  }

  await prisma.project.update({
    where: {
      id: workspace.stagingWorkspaceId,
    },
    data: {
      logo: workspace.logo,
      name: `${workspace.name} (Staging)`,
      slug: getPreferredStagingSlug(workspace.slug),
      plan: workspace.plan,
      planTier: workspace.planTier,
      planPeriod: workspace.planPeriod,
    },
  });
}
