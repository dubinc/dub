import { saleEventSchemaTB } from "../zod/schemas/sales";
import { tb } from "./client";

export const recordSale = tb.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB,
});
