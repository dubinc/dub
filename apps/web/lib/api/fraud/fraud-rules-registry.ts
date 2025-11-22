import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkCrossProgramBan } from "./rules/check-partner-cross-program-ban";
import { checkPartnerDuplicatePayoutMethod } from "./rules/check-partner-duplicate-payout-method";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRulesRegistry: Record<
  Partial<FraudRuleType>,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,
  partnerCrossProgramBan: checkCrossProgramBan,
  partnerDuplicatePayoutMethod: checkPartnerDuplicatePayoutMethod,
};
