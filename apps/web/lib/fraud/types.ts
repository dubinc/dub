import { FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { fraudRuleSchema } from "../zod/schemas/fraud";
import { fraudEventContext, fraudPartnerContext } from "./schemas";

export interface FraudTriggeredRule {
  triggered: boolean;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleInfo {
  type: FraudRuleType;
  name: string;
  description: string;
  scope: "partner" | "conversionEvent";
  riskLevel?: "low" | "medium" | "high";
}

export type FraudRuleProps = z.infer<typeof fraudRuleSchema>;

export type FraudPartnerContext = z.infer<typeof fraudPartnerContext>;

export type FraudEventContext = z.infer<typeof fraudEventContext>;
