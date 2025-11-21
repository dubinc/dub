import { FraudEventProps } from "@/lib/types";
import { FraudRuleType } from "@dub/prisma/client";
import React from "react";
import { FraudCrossProgramBanTable } from "./fraud-cross-program-ban-table";
import { FraudDuplicatePayoutMethodTable } from "./fraud-duplicate-payout-method-table";
import { FraudMatchingCustomerEmailTable } from "./fraud-matching-customer-email-table";

const FRAUD_EVENTS_TABLES: Partial<
  Record<FraudRuleType, React.ComponentType<{ fraudEvent: FraudEventProps }>>
> = {
  customerEmailMatch: FraudMatchingCustomerEmailTable,
  customerEmailSuspiciousDomain: FraudMatchingCustomerEmailTable,
  partnerCrossProgramBan: FraudCrossProgramBanTable,
  partnerDuplicatePayoutMethod: FraudDuplicatePayoutMethodTable,
};

export function FraudEventsTableWrapper({
  fraudEvent,
}: {
  fraudEvent: FraudEventProps;
}) {
  const TableComponent = FRAUD_EVENTS_TABLES[fraudEvent.type];

  if (!TableComponent) {
    return null;
  }

  return <TableComponent fraudEvent={fraudEvent} />;
}
