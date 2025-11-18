import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkCrossProgramBan } from "./rules/check-partner-cross-program-ban";
import { checkPartnerEmailDomainMismatch } from "./rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailSuspicious } from "./rules/check-partner-email-suspicious";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRulesRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,

  // Partner specific
  partnerCrossProgramBan: checkCrossProgramBan,
  partnerEmailSuspiciousDomain: checkPartnerEmailSuspicious,
  partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch,

  // Not done yet
  partnerEmailMasked: checkCrossProgramBan,
  partnerDuplicatePayoutMethod: checkCrossProgramBan,
  partnerNoSocialLinks: checkCrossProgramBan,
  partnerNoVerifiedSocialLinks: checkCrossProgramBan,
};
