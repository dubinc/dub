import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSimilar } from "./rules/check-customer-email-similar";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkProgramBanned } from "./rules/check-program-banned";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

export const fraudRulesRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailSimilar: checkCustomerEmailSimilar,
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,
  programBanned: checkProgramBanned,
};
