import * as z from "zod/v4";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const recordLead = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

export const recordLeadWithTimestamp = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});
