import z from "../zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { linkEventSchema } from "../zod/schemas/links";
import { leadEventSchema, saleEventSchema } from "./schemas";

export type LinkEventDataProps = z.infer<typeof linkEventSchema>;

export type ClickEventDataProps = z.infer<typeof clickEventSchema>;

export type LeadEventDataProps = z.infer<typeof leadEventSchema>;

export type SaleEventDataProps = z.infer<typeof saleEventSchema>;

export type EventDataProps =
  | LinkEventDataProps
  | ClickEventDataProps
  | LeadEventDataProps
  | SaleEventDataProps;
