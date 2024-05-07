import { conversionEventSchemaTB } from "../zod/schemas/conversions";
import { tb } from "./client";

export const recordConversion = tb.buildIngestEndpoint({
  datasource: "dub_conversion_events",
  event: conversionEventSchemaTB,
});
