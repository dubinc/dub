import { fraudEventGroupProps } from "@/lib/types";
import { FraudRuleType } from "@dub/prisma/client";
import React from "react";
import { FraudCrossProgramBanTable } from "./fraud-cross-program-ban-table";
import { FraudMatchingCustomerEmailTable } from "./fraud-matching-customer-email-table";
import { FraudPaidTrafficDetectedTable } from "./fraud-paid-traffic-detected-table";
import { FraudPartnerInfoTable } from "./fraud-partner-info-table";
import { FraudReferralSourceBannedTable } from "./fraud-referral-source-banned-table";

const FRAUD_EVENTS_TABLES: Partial<Record<FraudRuleType, React.ComponentType>> =
  {
    customerEmailMatch: FraudMatchingCustomerEmailTable,
    customerEmailSuspiciousDomain: FraudMatchingCustomerEmailTable,
    referralSourceBanned: FraudReferralSourceBannedTable,
    paidTrafficDetected: FraudPaidTrafficDetectedTable,
    partnerFraudReport: FraudPartnerInfoTable,
    partnerCrossProgramBan: FraudCrossProgramBanTable,
    partnerDuplicatePayoutMethod: FraudPartnerInfoTable,
  };

export function FraudEventsTableWrapper({
  fraudEventGroup,
}: {
  fraudEventGroup: fraudEventGroupProps;
}) {
  const TableComponent = FRAUD_EVENTS_TABLES[fraudEventGroup.type];

  if (!TableComponent) {
    return null;
  }

  return <TableComponent />;
}
