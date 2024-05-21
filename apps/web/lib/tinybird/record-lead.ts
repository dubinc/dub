import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const recordLead = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});
