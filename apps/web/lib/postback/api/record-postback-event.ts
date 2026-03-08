import { postbackEventInputSchemaTB } from "@/lib/postback/schemas";
import { tb } from "../../tinybird/client";

export const recordPostbackEvent = tb.buildIngestEndpoint({
  datasource: "dub_postback_events",
  event: postbackEventInputSchemaTB.omit({ timestamp: true }),
});
