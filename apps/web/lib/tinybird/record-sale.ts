import { waitUntil } from "@vercel/functions";
import z from "../zod";
import { saleEventSchemaTB } from "../zod/schemas/sales";
import { tb, tbNew } from "./client";

export const recordSaleTB = tb.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB,
});

// TODO: Remove after Tinybird migration
export const recordSaleNewTB = tbNew.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB,
});

export const recordSale = async (payload: any) => {
  waitUntil(recordSaleNewTB(payload));
  return await recordSaleTB(payload);
};

export const recordSaleWithTimestampTB = tb.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordSaleWithTimestampNewTB = tbNew.buildIngestEndpoint({
  datasource: "dub_sale_events",
  event: saleEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

export const recordSaleWithTimestamp = async (payload: any) => {
  waitUntil(recordSaleWithTimestampNewTB(payload));
  return await recordSaleWithTimestampTB(payload);
};
