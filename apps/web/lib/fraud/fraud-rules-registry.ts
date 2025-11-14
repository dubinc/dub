import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSimilar } from "./rules/check-customer-email-similar";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkProgramBanned } from "./rules/check-program-banned";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRuleRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailSimilar: checkCustomerEmailSimilar,
  customerEmailMatch: checkCustomerEmailMatch,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,
  programBanned: checkProgramBanned,
};
