import click from "./click.json";
import lead from "./lead.json";
import linkCreated from "./link-created.json";
import linkDeleted from "./link-deleted.json";
import linkUpdated from "./link-updated.json";
import sale from "./sale.json";

export const samplePayload = {
  "link.created": linkCreated,
  "link.updated": linkUpdated,
  "link.deleted": linkDeleted,
  "link.clicked": click,
  "lead.created": lead,
  "sale.created": sale,
};
