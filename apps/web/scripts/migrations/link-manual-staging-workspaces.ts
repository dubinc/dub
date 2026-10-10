import { planHasPartnerAccess } from "@/lib/plans/has-partner-access";
import { prisma } from "@/lib/prisma";
import { TRIAL_LIMITS } from "@dub/utils";
import { Project, WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const SLUG_SUFFIX_REGEX = /-staging$/;

async function main() {
  // Manually created staging workspaces are paid production workspaces whose slug ends with -staging
  const manualWorkspaces = await prisma.project.findMany({
    where: {
      environment: WorkspaceEnvironment.production,
      plan: {
        notIn: ["free", "pro"],
      },
      slug: {
        endsWith: "-staging",
      },
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      stripeId: true,
    },
  });

  const productWorkspaceSlugs = manualWorkspaces.map((workspace) =>
    workspace.slug.replace(SLUG_SUFFIX_REGEX, ""),
  );

  const productionWorkspaces = await prisma.project.findMany({
    where: {
      slug: {
        in: productWorkspaceSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      plan: true,
      planTier: true,
      planPeriod: true,
      stripeId: true,
    },
  });

  const productionBySlug = new Map(
    productionWorkspaces.map((workspace) => [workspace.slug, workspace]),
  );

  const workspacePairs = manualWorkspaces.flatMap((staging) => {
    const production = productionBySlug.get(
      staging.slug.replace(SLUG_SUFFIX_REGEX, ""),
    );

    if (!production) {
      return [];
    }

    return [
      {
        stagingWorkspaceId: staging.id,
        stagingSlug: staging.slug,
        stagingPlan: staging.plan,
        stagingStripeId: staging.stripeId,
        productionWorkspaceId: production.id,
        productionSlug: production.slug,
        productionPlan: production.plan,
        productionStripeId: production.stripeId,
      },
    ];
  });

  console.table(workspacePairs);

  const programsToSync = await prisma.program.findMany({
    where: {
      workspaceId: {
        in: workspacePairs.map(({ stagingWorkspaceId }) => stagingWorkspaceId),
      },
      environment: {
        not: WorkspaceEnvironment.staging,
      },
    },
    select: {
      id: true,
      slug: true,
      workspaceId: true,
      environment: true,
    },
  });

  console.table(programsToSync);

  // Staging programs whose production plan has no partner access get deactivated
  const programsToDeactivate = programsToSync.filter(({ workspaceId }) => {
    const pair = workspacePairs.find(
      ({ stagingWorkspaceId }) => stagingWorkspaceId === workspaceId,
    );

    return pair && !planHasPartnerAccess(pair.productionPlan);
  });

  console.log(
    "Staging programs to deactivate:",
    programsToDeactivate.map(({ slug }) => slug),
  );

  if (DRY_RUN) {
    return;
  }

  for (const workspace of workspacePairs) {
    try {
      await linkStagingWorkspace({
        ...workspace,
        productionWorkspace: productionBySlug.get(workspace.productionSlug)!,
      });
      console.log(
        `Linked ${workspace.productionSlug} -> ${workspace.stagingSlug}`,
      );
    } catch (error) {
      console.error(
        `Failed to link ${workspace.productionSlug} -> ${workspace.stagingSlug}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

// Point the production workspace at the manual staging workspace and mark it (and its programs) as staging.
// Also copy the fields the sync-workspace job keeps in sync, so staging matches production right away.
async function linkStagingWorkspace({
  productionWorkspaceId,
  productionSlug,
  stagingWorkspaceId,
  stagingSlug,
  productionWorkspace,
}: {
  productionWorkspaceId: string;
  productionSlug: string;
  stagingWorkspaceId: string;
  stagingSlug: string;
  productionWorkspace: Pick<
    Project,
    "name" | "logo" | "plan" | "planTier" | "planPeriod"
  >;
}) {
  await prisma.$transaction(async (tx) => {
    const production = await tx.project.updateMany({
      where: {
        id: productionWorkspaceId,
        environment: WorkspaceEnvironment.production,
        stagingWorkspaceId: null,
      },
      data: {
        stagingWorkspaceId,
      },
    });

    if (production.count === 0) {
      throw new Error(
        `${productionSlug} is not a production workspace or is already linked.`,
      );
    }

    const staging = await tx.project.updateMany({
      where: {
        id: stagingWorkspaceId,
        environment: {
          not: WorkspaceEnvironment.sandbox,
        },
        stagingWorkspaceId: null,
      },
      data: {
        environment: WorkspaceEnvironment.staging,
        name: `${productionWorkspace.name} (Staging)`,
        logo: productionWorkspace.logo,
        plan: productionWorkspace.plan,
        planTier: productionWorkspace.planTier,
        planPeriod: productionWorkspace.planPeriod,
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
    });

    if (staging.count === 0) {
      throw new Error(
        `${stagingSlug} is a sandbox workspace or has its own staging workspace.`,
      );
    }

    await tx.program.updateMany({
      where: {
        workspaceId: stagingWorkspaceId,
        environment: {
          not: WorkspaceEnvironment.staging,
        },
      },
      data: {
        environment: WorkspaceEnvironment.staging,
      },
    });

    // Match deactivateProgram's database changes when production has no partner access.
    // Partner enrollments are left as they are, because that part runs in a cron job.
    if (!planHasPartnerAccess(productionWorkspace.plan)) {
      await tx.program.updateMany({
        where: {
          workspaceId: stagingWorkspaceId,
          deactivatedAt: null,
        },
        data: {
          deactivatedAt: new Date(),
          messagingEnabledAt: null,
          addedToMarketplaceAt: null,
          featuredOnMarketplaceAt: null,
        },
      });

      await tx.partnerGroup.updateMany({
        where: {
          program: {
            workspaceId: stagingWorkspaceId,
          },
        },
        data: {
          applicationFormPublishedAt: null,
          landerPublishedAt: null,
          autoApprovePartnersEnabledAt: null,
        },
      });
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
