import z from "../zod";
import { affiliateSchema } from "./schemas";

export type AffiliateProps = z.infer<typeof affiliateSchema>;
