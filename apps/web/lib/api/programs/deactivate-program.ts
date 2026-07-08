import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Project } from "@prisma/client";

export async function deactivateProgram(
  workspace: Pick<Project, "defaultProgramId" | "stagingWorkspaceId">,
) {
  if (!workspace.defaultProgramId) {
    throw new Error("[deactivateProgram] defaultProgramId is required");
  }

  const programIds = [workspace.defaultProgramId];

  if (workspace.stagingWorkspaceId) {
    const stagingWorkspace = await prisma.project.findUnique({
      where: {
        id: workspace.stagingWorkspaceId,
      },
      select: {
        defaultProgramId: true,
      },
    });

    if (stagingWorkspace?.defaultProgramId) {
      programIds.push(stagingWorkspace.defaultProgramId);
    }
  }

  await prisma.$transaction(
    programIds.flatMap((id) => [
      prisma.program.update({
        where: {
          id,
        },
        data: {
          deactivatedAt: new Date(),
          // additional fields to reset
          messagingEnabledAt: null,
          addedToMarketplaceAt: null,
          featuredOnMarketplaceAt: null,
        },
      }),

      prisma.partnerGroup.updateMany({
        where: {
          programId: id,
        },
        data: {
          applicationFormPublishedAt: null,
          landerPublishedAt: null,
          autoApprovePartnersEnabledAt: null,
        },
      }),
    ]),
  );

  const responses = await Promise.all(
    programIds.map((id) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/deactivate`,
        body: {
          programId: id,
        },
        deduplicationId: `deactivate-program-${id}`,
      }),
    ),
  );

  console.log("[deactivateProgram] Deactivation jobs enqueued.", {
    programIds,
    responses,
  });

  return responses;
}
