import { postbackEventSchemaTB } from "@/lib/postback/schemas";
import { tb } from "./client";

export const recordPostbackEvent = tb.buildIngestEndpoint({
  datasource: "dub_partner_postback_events",
  event: postbackEventSchemaTB.omit({ timestamp: true }),
});
