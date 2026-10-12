import type { WebhookTrigger } from "@/lib/webhook/types";
import bountyCreated from "./bounty-created.json";
import bountyUpdated from "./bounty-updated.json";
import commissionCreated from "./commission-created.json";
import discountCodeCreated from "./discount-code-created.json";
import discountCodeDeleted from "./discount-code-deleted.json";
import leadCreated from "./lead-created.json";
import linkClicked from "./link-clicked.json";
import linkCreated from "./link-created.json";
import linkDeleted from "./link-deleted.json";
import linkUpdated from "./link-updated.json";
import partnerEnrolled from "./partner-enrolled.json";
import partnerMerged from "./partner-merged.json";
import payoutConfirmed from "./payout-confirmed.json";
import programApplicationCreated from "./program-application-created.json";
import programApplicationSubmitted from "./program-application-submitted.json";
import saleCreated from "./sale-created.json";

export const samplePayload: Record<WebhookTrigger, any> = {
  "link.created": linkCreated,
  "link.updated": linkUpdated,
  "link.deleted": linkDeleted,
  "link.clicked": linkClicked,
  "lead.created": leadCreated,
  "sale.created": saleCreated,
  "partner.application_submitted": programApplicationSubmitted,
  "program_application.created": programApplicationCreated,
  "partner.enrolled": partnerEnrolled,
  "partner.merged": partnerMerged,
  "commission.created": commissionCreated,
  "bounty.created": bountyCreated,
  "bounty.updated": bountyUpdated,
  "payout.confirmed": payoutConfirmed,
  "discount_code.created": discountCodeCreated,
  "discount_code.deleted": discountCodeDeleted,
};
