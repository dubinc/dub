import { parseMetadata } from "@/lib/metadata-filters/parse-metadata";
import { toDate } from "@dub/utils";
import type {
  Commission,
  Customer,
  Partner,
  Payout,
  ProgramEnrollment,
} from "@prisma/client";

export type CommissionListRow = Commission & {
  customerName: Customer["name"];
  customerEmail: Customer["email"];
  customerAvatar: Customer["avatar"];
  customerExternalId: Customer["externalId"];
  customerStripeCustomerId: Customer["stripeCustomerId"];
  customerCountry: Customer["country"];
  customerSales: Customer["sales"] | null;
  customerSaleAmount: Customer["saleAmount"] | null;
  customerCreatedAt: Customer["createdAt"] | null;
  customerFirstSaleAt: Customer["firstSaleAt"];
  customerSubscriptionCanceledAt: Customer["subscriptionCanceledAt"];
  partnerName: Partner["name"];
  partnerEmail: Partner["email"];
  partnerImage: Partner["image"];
  partnerPayoutsEnabledAt: Partner["payoutsEnabledAt"];
  partnerCountry: Partner["country"];
} & Pick<ProgramEnrollment, "groupId" | "tenantId"> &
  Pick<Payout, "paidAt">;

// Map a flat JOIN row into the nested shape
export function mapCommissionListRow(row: CommissionListRow) {
  return {
    id: row.id,
    programId: row.programId,
    partnerId: row.partnerId,
    rewardId: row.rewardId,
    linkId: row.linkId,
    payoutId: row.payoutId,
    invoiceId: row.invoiceId,
    customerId: row.customerId,
    eventId: row.eventId,
    description: row.description,
    type: row.type,
    amount: Number(row.amount),
    quantity: Number(row.quantity),
    earnings: Number(row.earnings),
    currency: row.currency,
    status: row.status,
    userId: row.userId,
    sourceCommissionId: row.sourceCommissionId,
    sourcePartnerId: row.sourcePartnerId,
    metadata: parseMetadata(row.metadata),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
    customer: mapCustomer(row),
    partner: mapPartner(row),
    programEnrollment: mapProgramEnrollment(row),
    payout: mapPayout(row),
  };
}

function mapCustomer(row: CommissionListRow) {
  if (!row.customerId) {
    return null;
  }

  return {
    id: row.customerId,
    name: row.customerName,
    email: row.customerEmail,
    avatar: row.customerAvatar,
    externalId: row.customerExternalId,
    stripeCustomerId: row.customerStripeCustomerId,
    country: row.customerCountry,
    sales: row.customerSales != null ? Number(row.customerSales) : 0,
    saleAmount:
      row.customerSaleAmount != null
        ? BigInt(row.customerSaleAmount)
        : BigInt(0),
    createdAt: toDate(row.customerCreatedAt)!,
    firstSaleAt: toDate(row.customerFirstSaleAt),
    subscriptionCanceledAt: toDate(row.customerSubscriptionCanceledAt),
  };
}

function mapPartner(row: CommissionListRow) {
  return {
    id: row.partnerId,
    name: row.partnerName,
    email: row.partnerEmail,
    image: row.partnerImage,
    payoutsEnabledAt: toDate(row.partnerPayoutsEnabledAt),
    country: row.partnerCountry,
  };
}

function mapProgramEnrollment(row: CommissionListRow) {
  return {
    groupId: row.groupId,
    tenantId: row.tenantId,
  };
}

function mapPayout(row: CommissionListRow) {
  if (!row.payoutId) {
    return null;
  }

  return {
    paidAt: toDate(row.paidAt),
  };
}
