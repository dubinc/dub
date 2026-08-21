import { getProgramEnrollmentOrThrow } from "../api/programs/get-program-enrollment-or-throw";
import { triggerQStashWorkflow } from "../cron/qstash-workflow";
import { CreatePartnerCommissionProps } from "../types";
import { constructWebhookPartner } from "./constuct-webhook-partner";

export const queuePartnerCommissionCreation = async (
  params: CreatePartnerCommissionProps,
) => {
  const { partnerId, programId, customerId, bountySubmissionId } = params;

  const result = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    include: {
      links: true,
      partner: true,
    },
  });

  const { partner, links, ...programEnrollment } = result;

  await triggerQStashWorkflow({
    workflowType: "create-partner-commission",
    workflowLabel: bountySubmissionId ?? customerId ?? partnerId,
    body: params,
    flowControl: {
      key: partnerId,
      parallelism: 1,
    },
  });

  return {
    partner,
    links,
    programEnrollment,
    webhookPartner: constructWebhookPartner(result),
  };
};
