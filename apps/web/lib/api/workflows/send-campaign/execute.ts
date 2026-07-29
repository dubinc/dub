import { evaluateWorkflowConditions } from "@/lib/api/workflows/evaluate-workflow-conditions";
import { WorkflowCondition, WorkflowContext } from "@/lib/api/workflows/types";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { prisma } from "@/lib/prisma";
import { TiptapNode } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { chunk, pluck } from "@dub/utils";
import {
  CommissionStatus,
  NotificationEmailType,
  Prisma,
  ProgramEnrollmentStatus,
  Workflow,
} from "@prisma/client";
import { addHours, differenceInDays, subDays } from "date-fns";
import { renderCampaignEmailHTML } from "../../campaigns/render-campaign-email-html";
import { campaignEligibilityIncludes } from "../../campaigns/transform-campaign";
import { validateCampaignFromAddress } from "../../campaigns/validate-campaign";
import { createId } from "../../create-id";
import { WorkflowAttributeKey } from "../attribute-definitions";
import { parseWorkflowConfig } from "../parse-workflow-config";
import { getWorkflowDataRequirements } from "../utils";

export const executeSendCampaignWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context?: WorkflowContext;
}) => {
  const { conditions, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.SendCampaign) {
    console.log(
      `Workflow ${workflow.id} is not a send campaign workflow: ${action.type}`,
    );
    return;
  }

  const { campaignId } = action.data;
  const { programId, partnerId } = context?.identity || {
    programId: workflow.programId,
    partnerId: undefined,
  };

  const campaign = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include: {
      ...campaignEligibilityIncludes,
      program: {
        include: {
          emailDomains: {
            where: {
              status: "verified",
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    console.log(`Workflow ${workflow.id} campaign ${campaignId} not found.`);
    return;
  }

  if (campaign.status !== "active") {
    console.log(`Campaign ${campaignId} is not active.`);
    return;
  }

  const campaignGroupIds = pluck(campaign.groups, "groupId");
  const campaignPartnerTagIds = pluck(campaign.partnerTags, "partnerTagId");

  let programEnrollments = partnerId
    ? await resolveProgramEnrollment({
        programId,
        partnerId,
        groupIds: campaignGroupIds,
        partnerTagIds: campaignPartnerTagIds,
        conditions,
      })
    : await resolveProgramEnrollments({
        programId,
        groupIds: campaignGroupIds,
        partnerTagIds: campaignPartnerTagIds,
        conditions,
      });

  if (programEnrollments.length === 0) {
    console.log(
      `Workflow ${workflow.id} no program enrollments found to send campaign emails to, skipping...`,
    );
    return;
  }

  console.log(
    `Found ${programEnrollments.length} program enrollments to send campaign emails to.`,
  );

  // Fetch already-sent campaign emails for these partners to prevent duplicates
  const alreadySentEmails = await prisma.notificationEmail.findMany({
    where: {
      campaignId: campaign.id,
      type: "Campaign",
      partnerId: {
        in: pluck(programEnrollments, "partnerId"),
      },
    },
    select: {
      partnerId: true,
    },
  });

  const alreadySentPartnerIds = pluck(alreadySentEmails, "partnerId");

  if (alreadySentPartnerIds.length > 0) {
    console.log(
      `Workflow ${workflow.id} already sent campaign emails to ${alreadySentPartnerIds.length} partners: ${alreadySentPartnerIds.join(", ")}`,
    );
  }

  const alreadySentPartnerIdSet = new Set(alreadySentPartnerIds);

  // Exclude partners who already got the campaign
  programEnrollments = programEnrollments.filter(
    ({ partnerId }) => !alreadySentPartnerIdSet.has(partnerId),
  );

  if (programEnrollments.length === 0) {
    console.log(
      `Workflow ${workflow.id} no program enrollments left to send campaign emails to.`,
    );
    return;
  }

  const program = campaign.program;

  // TODO: We should make the from address required. There are existing campaign without from adress
  if (campaign.from) {
    validateCampaignFromAddress({
      campaign,
      emailDomains: program.emailDomains,
    });
  }

  const programEnrollmentsChunks = chunk(programEnrollments, 100);

  for (const programEnrollmentChunk of programEnrollmentsChunks) {
    const partnerUsers = programEnrollmentChunk.flatMap((enrollment) =>
      enrollment.partner.users
        .filter(({ user }) => user.email) // only include users with an email
        .map(({ user }) => ({
          ...user,
          partner: {
            ...enrollment.partner,
            users: undefined,
          },
          enrollment: {
            ...enrollment,
            partner: undefined,
          },
        })),
    );

    // Send emails
    const { data } = await sendBatchEmail(
      partnerUsers.map((partnerUser) => ({
        variant: "notifications",
        ...(campaign.from ? { from: campaign.from } : {}),
        to: partnerUser.email!,
        subject: campaign.subject,
        replyTo: program.supportEmail || "noreply",
        react: CampaignEmail({
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
            messagingEnabledAt: program.messagingEnabledAt,
          },
          campaign: {
            type: campaign.type,
            preview: campaign.preview,
            body: renderCampaignEmailHTML({
              content: campaign.bodyJson as unknown as TiptapNode,
              variables: {
                PartnerName: partnerUser.partner.name,
                PartnerEmail: partnerUser.partner.email,
                PartnerLink:
                  constructPartnerLink({
                    group: partnerUser.enrollment.partnerGroup,
                    link: partnerUser.enrollment.links?.[0],
                  }) || null,
              },
            }),
          },
        }),
        tags: [{ name: "type", value: "notification-email" }],
        headers: {
          "Idempotency-Key": `${campaign.id}-${partnerUser.id}`,
        },
      })),
    );

    console.log(
      `Workflow ${workflow.id} sent ${data?.data.length} emails for campaign ${campaignId}.`,
    );

    if (data) {
      const notificationEmails = await prisma.notificationEmail.createMany({
        data: partnerUsers.map((partnerUser, idx) => ({
          id: createId({ prefix: "em_" }),
          type: NotificationEmailType.Campaign,
          emailId: data.data[idx].id,
          campaignId: campaign.id,
          programId: campaign.programId,
          partnerId: partnerUser.partner.id,
          recipientUserId: partnerUser.id,
        })),
      });

      console.log(
        `Workflow ${workflow.id} created ${notificationEmails.count} notification emails for campaign ${campaignId}.`,
      );
    }
  }
};

const programEnrollmentInclude = {
  partner: {
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  },
  partnerGroup: {
    select: {
      linkStructure: true,
    },
  },
  links: {
    select: {
      shortLink: true,
      key: true,
      url: true,
      clicks: true,
      leads: true,
      conversions: true,
      sales: true,
      saleAmount: true,
    },
    orderBy: {
      id: "asc" as const,
    },
  },
} satisfies Prisma.ProgramEnrollmentInclude;

function campaignAudienceWhere({
  groupIds,
  partnerTagIds,
}: {
  groupIds: string[];
  partnerTagIds: string[];
}) {
  return {
    status: ProgramEnrollmentStatus.approved,
    ...(groupIds.length > 0 && {
      groupId: {
        in: groupIds,
      },
    }),
    ...(partnerTagIds.length > 0 && {
      partner: {
        programPartnerTags: {
          some: {
            partnerTagId: {
              in: partnerTagIds,
            },
          },
        },
      },
    }),
  };
}

type ResolveProgramEnrollment = {
  partnerId: string;
  programId: string;
  groupIds: string[];
  partnerTagIds: string[];
  conditions: WorkflowCondition[];
};

async function resolveProgramEnrollment({
  programId,
  partnerId,
  groupIds,
  partnerTagIds,
  conditions,
}: ResolveProgramEnrollment) {
  const { commissions, partnerLinkStats } = getWorkflowDataRequirements({
    conditions,
  });

  const [programEnrollment, totalCommissions] = await Promise.all([
    prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
        ...campaignAudienceWhere({
          groupIds,
          partnerTagIds,
        }),
      },
      include: programEnrollmentInclude,
    }),

    commissions
      ? await prisma.commission.aggregate({
          where: {
            earnings: {
              not: 0,
            },
            programId,
            partnerId,
            status: {
              in: [
                CommissionStatus.pending,
                CommissionStatus.processed,
                CommissionStatus.paid,
              ],
            },
          },
          _sum: {
            earnings: true,
          },
        })
      : Promise.resolve({
          _sum: {
            earnings: 0,
          },
        }),
  ]);

  if (!programEnrollment) {
    return [];
  }

  const workflowContext: Partial<Record<WorkflowAttributeKey, number | null>> =
    {
      ...(partnerLinkStats
        ? aggregatePartnerLinksStats(
            programEnrollment.links as unknown as NonNullable<
              Parameters<typeof aggregatePartnerLinksStats>[0]
            >,
          )
        : {}),
      totalCommissions: totalCommissions._sum.earnings,
      partnerJoined: differenceInDays(new Date(), programEnrollment.createdAt),
    };

  const shouldExecute = evaluateWorkflowConditions({
    conditions,
    context: workflowContext,
  });

  if (!shouldExecute) {
    return [];
  }

  return [programEnrollment];
}

// Run only for scheduled workflows
async function resolveProgramEnrollments({
  programId,
  groupIds,
  partnerTagIds,
  conditions,
}: Omit<ResolveProgramEnrollment, "partnerId">) {
  const partnerEnrolledDays = conditions.find(
    (condition) => condition.attribute === "partnerEnrolledDays",
  );

  if (!partnerEnrolledDays) {
    console.log("No partner enrolled days condition found. Skipping...");
    return [];
  }

  const startDate = subDays(new Date(), partnerEnrolledDays.value as number);
  // add 12 hours to the start date since we run the scheduled enrollment workflow every 12 hours
  const endDate = addHours(startDate, 12);

  // partnerEnrolledDays is enforced by the enrollment window query below —
  // re-evaluating it with differenceInDays can false-negative partners in the window.
  const remainingConditions = conditions.filter(
    (condition) => condition.attribute !== "partnerEnrolledDays",
  );

  const { commissions, partnerLinkStats } = getWorkflowDataRequirements({
    conditions: remainingConditions,
  });

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      ...campaignAudienceWhere({
        groupIds,
        partnerTagIds,
      }),
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: programEnrollmentInclude,
    take: 1000, // rough estimate that a program cannot get more than 1000 enrollments every 12 hours
  });

  if (programEnrollments.length === 0 || remainingConditions.length === 0) {
    return programEnrollments;
  }

  const commissionsByPartnerId = new Map<string, number>();

  if (commissions) {
    const commissionTotals = await prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        earnings: {
          not: 0,
        },
        programId,
        partnerId: {
          in: pluck(programEnrollments, "partnerId"),
        },
        status: {
          in: [
            CommissionStatus.pending,
            CommissionStatus.processed,
            CommissionStatus.paid,
          ],
        },
      },
      _sum: {
        earnings: true,
      },
    });

    for (const { partnerId, _sum } of commissionTotals) {
      commissionsByPartnerId.set(partnerId, _sum.earnings ?? 0);
    }
  }

  return programEnrollments.filter((programEnrollment) => {
    const workflowContext: Partial<
      Record<WorkflowAttributeKey, number | null>
    > = {
      ...(partnerLinkStats
        ? aggregatePartnerLinksStats(
            programEnrollment.links as unknown as NonNullable<
              Parameters<typeof aggregatePartnerLinksStats>[0]
            >,
          )
        : {}),
      totalCommissions:
        commissionsByPartnerId.get(programEnrollment.partnerId) ?? 0,
      partnerJoined: differenceInDays(new Date(), programEnrollment.createdAt),
    };

    return evaluateWorkflowConditions({
      conditions: remainingConditions,
      context: workflowContext,
    });
  });
}
