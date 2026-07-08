import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Project } from "@prisma/client";

export async function reactivateProgram(
  workspace: Pick<Project, "defaultProgramId" | "stagingWorkspaceId">,
) {
  if (!workspace.defaultProgramId) {
    throw new Error("[reactivateProgram] defaultProgramId is required");
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
          deactivatedAt: null,
        },
      }),

      // republish the default group
      prisma.partnerGroup.update({
        where: {
          programId_slug: {
            programId: id,
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
        data: {
          applicationFormPublishedAt: new Date(),
          landerPublishedAt: new Date(),
        },
      }),
    ]),
  );

  const responses = await Promise.all(
    programIds.map((id) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/reactivate`,
        body: {
          programId: id,
        },
        deduplicationId: `reactivate-program-${id}`,
      }),
    ),
  );

  console.log("[reactivateProgram] Reactivation jobs enqueued.", {
    programIds,
    responses,
  });

  return responses;
}
