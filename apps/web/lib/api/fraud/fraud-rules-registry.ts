import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRulesRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,

  partnerCrossProgramBan: defineFraudRule({
    type: "partnerCrossProgramBan",
    evaluate: async () => ({ triggered: false }),
  }),

  partnerDuplicatePayoutMethod: defineFraudRule({
    type: "partnerDuplicatePayoutMethod",
    evaluate: async () => ({ triggered: false }),
  }),
};
