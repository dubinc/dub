import { z } from "zod";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const recordLead = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

export const recordLeadSync = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
  wait: true,
});

export const recordLeadWithTimestamp = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});
