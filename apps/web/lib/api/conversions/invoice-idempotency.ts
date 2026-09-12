// TODO: remove after 2026-08-10 (10 days after rollout) once the transition
// window has elapsed and no keys written under the old Stripe-only format
// remain (they carry a 7-day TTL).

export const invoiceDedupeKey = (workspaceId: string, invoiceId: string) =>
  `trackSale:${workspaceId}:invoiceId:${invoiceId}`;

export const legacyStripeInvoiceDedupeKey = (invoiceId: string) =>
  `trackSale:stripe:invoiceId:${invoiceId}`;
