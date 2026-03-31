import { WebhookTrigger } from "@/lib/types";
import bountyCreated from "./bounty-created.json";
import bountyUpdated from "./bounty-updated.json";
import commissionCreated from "./commission-created.json";
import leadCreated from "./lead-created.json";
import linkClicked from "./link-clicked.json";
import linkCreated from "./link-created.json";
import linkDeleted from "./link-deleted.json";
import linkUpdated from "./link-updated.json";
import partnerApplicationSubmitted from "./partner-application-submitted.json";
import partnerEnrolled from "./partner-enrolled.json";
import payoutConfirmed from "./payout-confirmed.json";
import saleCreated from "./sale-created.json";

export const samplePayload: Record<WebhookTrigger, any> = {
  "link.created": linkCreated,
  "link.updated": linkUpdated,
  "link.deleted": linkDeleted,
  "link.clicked": linkClicked,
  "lead.created": leadCreated,
  "sale.created": saleCreated,
  "partner.application_submitted": partnerApplicationSubmitted,
  "partner.enrolled": partnerEnrolled,
  "commission.created": commissionCreated,
  "bounty.created": bountyCreated,
  "bounty.updated": bountyUpdated,
  "payout.confirmed": payoutConfirmed,
};
