import { fraudRuleSchema } from "@/lib/zod/schemas/fraud";
import { FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import {
  fraudEventContext,
  fraudPartnerContext,
} from "../../zod/schemas/schemas";

export type ExtendedFraudRuleType =
  | FraudRuleType
  | "partnerEmailDomainMismatch"
  | "partnerEmailMasked"
  | "partnerNoSocialLinks"
  | "partnerNoVerifiedSocialLinks";

export type FraudSeverity = "low" | "medium" | "high";

export interface FraudTriggeredRule {
  triggered: boolean;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleInfo {
  type: ExtendedFraudRuleType;
  name: string;
  description: string;
  scope: "partner" | "conversionEvent";
  severity?: FraudSeverity;
  crossProgram?: boolean;
  configurable: boolean;
}

export type FraudRuleProps = z.infer<typeof fraudRuleSchema>;

export type FraudPartnerContext = z.infer<typeof fraudPartnerContext>;

export type FraudEventContext = z.infer<typeof fraudEventContext>;
