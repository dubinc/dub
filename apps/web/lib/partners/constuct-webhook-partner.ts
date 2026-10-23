import { toCentsNumber } from "@dub/utils";
import { Link, Partner, ProgramEnrollment } from "@prisma/client";
import { aggregatePartnerLinksStats } from "./aggregate-partner-links-stats";

export const constructWebhookPartner = (
  programEnrollment: ProgramEnrollment & { partner: Partner; links: Link[] },
  {
    totalCommissions: totalCommissionsParam,
  }: { totalCommissions?: number } = {},
) => {
  const totalCommissions =
    totalCommissionsParam ?? toCentsNumber(programEnrollment.totalCommissions);
  return {
    ...programEnrollment.partner,
    groupId: programEnrollment.groupId,
    ...aggregatePartnerLinksStats(programEnrollment.links),
    totalCommissions,
  };
};
