import z from "../zod";
import { saleEventSchemaTB } from "../zod/schemas/sales";
import { tb } from "./client";

export const recordSale = tb.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB,
});

export const recordSaleWithTimestamp = tb.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});
