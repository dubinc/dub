import leadCreated from "./lead-created.json";
import linkClicked from "./link-clicked.json";
import linkCreated from "./link-created.json";
import linkDeleted from "./link-deleted.json";
import linkUpdated from "./link-updated.json";
import saleCreated from "./sale-created.json";

// TODO:
// Make this more typesafe
export const samplePayload = {
  "link.created": linkCreated,
  "link.updated": linkUpdated,
  "link.deleted": linkDeleted,
  "link.clicked": linkClicked,
  "lead.created": leadCreated,
  "sale.created": saleCreated,
} as any;
