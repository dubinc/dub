import { FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { fraudRuleSchema } from "../zod/schemas/fraud";

export interface FraudRuleContext {
  [key: string]: unknown;
}

export interface FraudTriggeredRule {
  triggered: boolean;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleInfo {
  type: FraudRuleType;
  name: string;
  description: string;
  scope: "partner" | "conversionEvent";
}

export type FraudRuleProps = z.infer<typeof fraudRuleSchema>;
