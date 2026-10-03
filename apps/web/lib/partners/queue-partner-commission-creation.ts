import { getProgramEnrollmentOrThrow } from "../api/programs/get-program-enrollment-or-throw";
import { dispatchWorkflows } from "../jobs/publish-workflows";
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

  await dispatchWorkflows({
    name: "create-partner-commission-workflow",
    payload: params,
    options: {
      flowControl: {
        key: partnerId,
        parallelism: 1,
      },
      label: bountySubmissionId ?? customerId ?? partnerId,
    },
  });

  return {
    partner,
    links,
    programEnrollment,
    webhookPartner: constructWebhookPartner(result),
  };
};
