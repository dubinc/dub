import { getHighestSeverity } from "@/lib/get-highest-severity";
import { ExtendedFraudRuleType } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Partner, Program } from "@dub/prisma/client";
import { FRAUD_RULES } from "./constants";
import { checkPartnerCountryMismatch } from "./rules/check-partner-country-mismatch";
import { checkPartnerEmailDomainMismatch } from "./rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailMasked } from "./rules/check-partner-email-masked";
import { checkPartnerNoSocialLinks } from "./rules/check-partner-no-social-links";
import { checkPartnerNoVerifiedSocialLinks } from "./rules/check-partner-no-verified-social-links";

export async function getApplicationRiskSignals({
  program,
  partner,
}: {
  program: Pick<Program, "id">;
  partner: Pick<
    Partner,
    | "id"
    | "visitorId"
    | "email"
    | "website"
    | "websiteVerifiedAt"
    | "youtubeVerifiedAt"
    | "twitterVerifiedAt"
    | "linkedinVerifiedAt"
    | "instagramVerifiedAt"
    | "tiktokVerifiedAt"
    | "country"
    | "visitorCountry"
  >;
}) {
  const [crossProgramBanCount, duplicatePayoutCount, duplicateAccountCount] =
    await Promise.all([
      // Cross-program bans
      prisma.programEnrollment.count({
        where: {
          partnerId: partner.id,
          programId: {
            not: program.id,
          },
          status: "banned",
        },
      }),

      // Duplicate payout method
      prisma.fraudEvent.count({
        where: {
          partnerId: partner.id,
          type: "partnerDuplicatePayoutMethod",
        },
      }),

      // Duplicate account
      partner.visitorId
        ? prisma.partner.count({
            where: {
              visitorId: partner.visitorId,
            },
          })
        : Promise.resolve(0),
    ]);

  const riskSignals: Partial<Record<ExtendedFraudRuleType, boolean>> = {
    partnerCrossProgramBan: crossProgramBanCount > 0,
    partnerDuplicatePayoutMethod: duplicatePayoutCount > 1,
    partnerDuplicateAccount: duplicateAccountCount > 1,
    partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch(partner),
    partnerEmailMasked: checkPartnerEmailMasked(partner),
    partnerNoSocialLinks: checkPartnerNoSocialLinks(partner),
    partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks(partner),
    partnerCountryMismatch: checkPartnerCountryMismatch(partner),
  };

  const triggeredRules = FRAUD_RULES.filter(
    (rule) => riskSignals[rule.type] === true,
  );

  const severity = getHighestSeverity(triggeredRules);

  return {
    riskSignals,
    severity,
  };
}
