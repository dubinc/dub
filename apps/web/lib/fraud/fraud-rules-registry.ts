import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkCustomerEmailMatch } from "./rules/check-customer-email-match";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidTrafficDetected } from "./rules/check-paid-traffic-detected";
import { checkCrossProgramBan } from "./rules/check-partner-cross-program-ban";
import { checkPartnerDuplicatePayoutMethod } from "./rules/check-partner-duplicate-payout-method";
import { checkPartnerEmailDomainMismatch } from "./rules/check-partner-email-domain-mismatch";
import { checkPartnerEmailMasked } from "./rules/check-partner-email-masked";
import { checkPartnerEmailSuspicious } from "./rules/check-partner-email-suspicious";
import { checkPartnerNoSocialLinks } from "./rules/check-partner-no-social-links";
import { checkPartnerNoVerifiedSocialLinks } from "./rules/check-partner-no-verified-social-links";
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
  partnerEmailSuspiciousDomain: checkPartnerEmailSuspicious,
  partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch,
  partnerEmailMasked: checkPartnerEmailMasked,
  partnerNoSocialLinks: checkPartnerNoSocialLinks,
  partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks,
  partnerDuplicatePayoutMethod: checkPartnerDuplicatePayoutMethod,
};
