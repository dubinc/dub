import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb, tbOld } from "./client";

export const recordLeadTB = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

// TODO: Remove after Tinybird migration
export const recordLeadTBOld = tbOld.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB,
});

export const recordLead = async (payload: any) => {
  waitUntil(recordLeadTBOld(payload));
  return await recordLeadTB(payload);
};

export const recordLeadWithTimestampTB = tb.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordLeadWithTimestampTBOld = tbOld.buildIngestEndpoint({
  datasource: "dub_lead_events",
  event: leadEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordLeadWithTimestamp = async (payload: any) => {
  waitUntil(recordLeadWithTimestampTBOld(payload));
  return await recordLeadWithTimestampTB(payload);
};
