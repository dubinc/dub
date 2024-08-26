import z from "../zod";
import {
  clickEventSchema,
  leadEventSchema,
  linkEventSchema,
  saleEventSchema,
} from "./schemas";

export type LinkEventData = z.infer<typeof linkEventSchema>;

export type ClickEventData = z.infer<typeof clickEventSchema>;

export type LeadEventData = z.infer<typeof leadEventSchema>;

export type SaleEventData = z.infer<typeof saleEventSchema>;
