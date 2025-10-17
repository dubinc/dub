import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb, tbNew } from "./client";

export const recordLeadTB = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

// TODO: Remove after Tinybird migration
export const recordLeadTBNew = tbNew.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

export const recordLead = async (payload: any) => {
  waitUntil(recordLeadTBNew(payload));
  return await recordLeadTB(payload);
};

export const recordLeadWithTimestampTB = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordLeadWithTimestampTBNew = tbNew.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordLeadWithTimestamp = async (payload: any) => {
  waitUntil(recordLeadWithTimestampTBNew(payload));
  return await recordLeadWithTimestampTB(payload);
};
