import { FraudTriggeredRule } from "@/lib/types";
import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkReferralSourceBanned } from "./rules/check-referral-source-banned";

// TS trick: these rules are evaluated elsewhere, so we stub their registry entry.
const defineFraudRuleStub = (type: FraudRuleType) => {
  return defineFraudRule({
    type,
    evaluate: async () => ({ triggered: false }),
  });
};

const FRAUD_RULES_REGISTRY: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  customerEmailMatch: checkCustomerEmailMatch,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
  referralSourceBanned: checkReferralSourceBanned,
  paidTrafficDetected: checkPaidTrafficDetected,
  partnerCrossProgramBan: defineFraudRuleStub("partnerCrossProgramBan"),
  partnerFraudReport: defineFraudRuleStub("partnerFraudReport"),
  partnerDuplicatePayoutMethod: defineFraudRuleStub(
    "partnerDuplicatePayoutMethod",
  ),
};

// Execute a fraud rule with the given context and configuration
export async function executeFraudRule<T extends FraudRuleType>({
  type,
  context,
  config,
}: {
  type: T;
  context: unknown;
  config?: unknown;
}): Promise<FraudTriggeredRule> {
  const rule = FRAUD_RULES_REGISTRY[type];

  if (!rule) {
    throw new Error(`Unknown fraud rule: ${type}`);
  }

  return await rule.evaluate(context, config);
}
