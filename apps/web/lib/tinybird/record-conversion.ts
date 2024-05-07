import z from "../zod";
import { tb } from "./client";
import { conversionEventSchemaTB } from "../zod/schemas/conversions";

export const recordConversion = tb.buildIngestEndpoint({
  datasource: "dub_conversion_events",
  event: conversionEventSchemaTB,
});
