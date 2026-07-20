import { prisma } from "@/lib/prisma";
import { PlanProps } from "@/lib/types";
import { nanoid, TRIAL_LIMITS } from "@dub/utils";
import { User, WorkspaceEnvironment, WorkspaceRole } from "@prisma/client";
import { generateRandomString } from "../api/utils/generate-random-string";
import { createWorkspaceId } from "../api/workspaces/create-workspace-id";

interface CreateSandboxWorkspaceProps {
  workspace: {
    name: string;
    slug: string;
    plan: PlanProps;
  };
  users: {
    email: string;
    role: WorkspaceRole;
  }[];
}

export async function createSandboxWorkspace({
  workspace,
  users,
}: CreateSandboxWorkspaceProps) {
  let usersFound: Pick<User, "id" | "email">[] = [];

  if (users.length > 0) {
    usersFound = await prisma.user.findMany({
      where: {
        email: {
          in: users.map((user) => user.email),
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (usersFound.length === 0) {
      console.error(
        "No users found. Please ensure the users exist in the database.",
      );
      return;
    }
  }

  const workspaceId = createWorkspaceId();

  const usersWithRoles = usersFound.map((user) => ({
    id: user.id,
    role: users.find((u) => u.email === user.email)?.role ?? "member",
  }));

  await prisma.$transaction(async (tx) => {
    await tx.project.create({
      data: {
        id: workspaceId,
        name: `${workspace.name} (Sandbox)`,
        slug: `${workspace.slug}-sandbox`,
        environment: WorkspaceEnvironment.sandbox,
        plan: workspace.plan,
        billingCycleStart: new Date().getDate(),
        invoicePrefix: generateRandomString(8),
        inviteCode: nanoid(24),
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
        defaultDomains: {
          create: {},
        },
      },
    });

    if (usersWithRoles.length > 0) {
      await tx.projectUsers.createMany({
        skipDuplicates: true,
        data: usersWithRoles.map((user) => ({
          projectId: workspaceId,
          userId: user.id,
          role: user.role,
        })),
      });

      const workspaceUsers = await tx.projectUsers.findMany({
        where: {
          projectId: workspaceId,
        },
        select: {
          id: true,
        },
      });

      await tx.notificationPreference.createMany({
        skipDuplicates: true,
        data: workspaceUsers.map((user) => ({
          projectUserId: user.id,
        })),
      });
    }
  });
}
