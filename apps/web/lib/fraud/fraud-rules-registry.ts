import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkCrossProgramBan } from "./rules/check-partner-cross-program-ban";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRulesRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,
  partnerCrossProgramBan: checkCrossProgramBan,

  // Not done yet
  partnerEmailSuspiciousDomain: checkCrossProgramBan,
  partnerEmailDomainMismatch: checkCrossProgramBan,
  partnerEmailMasked: checkCrossProgramBan,
  partnerDuplicatePayoutMethod: checkCrossProgramBan,
  partnerNoSocialLinks: checkCrossProgramBan,
  partnerNoVerifiedSocialLinks: checkCrossProgramBan,
};
