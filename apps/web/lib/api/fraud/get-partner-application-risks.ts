import { getHighestSeverity } from "@/lib/get-highest-severity";
import { ExtendedFraudRuleType, PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { FRAUD_RULES } from "./constants";
import { checkPartnerEmailDomainMismatch } from "./rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailMasked } from "./rules/check-partner-email-masked";
import { checkPartnerNoSocialLinks } from "./rules/check-partner-no-social-links";
import { checkPartnerNoVerifiedSocialLinks } from "./rules/check-partner-no-verified-social-links";

export async function getPartnerApplicationRisks({
  program,
  partner,
}: {
  program: Pick<Program, "id">;
  partner: Pick<PartnerProps, "id" | "email" | "country" | "platforms">;
}) {
  const fraudGroups = await prisma.fraudEventGroup.findMany({
    where: {
      programId: program.id,
      partnerId: partner.id,
      status: "pending",
      type: {
        in: ["partnerCrossProgramBan", "partnerDuplicatePayoutMethod"],
      },
    },
  });

  const hasCrossProgramBan = fraudGroups.some(
    (group) => group.type === "partnerCrossProgramBan",
  );

  const hasDuplicatePayoutMethod = fraudGroups.some(
    (group) => group.type === "partnerDuplicatePayoutMethod",
  );

  const risksDetected: Partial<Record<ExtendedFraudRuleType, boolean>> = {
    partnerCrossProgramBan: hasCrossProgramBan,
    partnerDuplicatePayoutMethod: hasDuplicatePayoutMethod,
    partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch(partner),
    partnerEmailMasked: checkPartnerEmailMasked(partner),
    partnerNoSocialLinks: checkPartnerNoSocialLinks(partner),
    partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks(partner),
  };

  const triggeredRules = FRAUD_RULES.filter(
    (rule) => risksDetected[rule.type] === true,
  );

  const riskSeverity = getHighestSeverity(triggeredRules);

  return {
    risksDetected,
    riskSeverity,
  };
}
