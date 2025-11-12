import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { FraudRuleEvaluationResult } from "./types";

export function defineFraudRule<
  TCtx extends z.ZodType,
  TCfg extends z.ZodType,
>(rule: {
  type: FraudRuleType;
  name: string;
  riskLevel: FraudRiskLevel;
  contextSchema: TCtx;
  configSchema: TCfg;
  defaultConfig: z.infer<TCfg>;
  evaluate: (
    context: z.infer<TCtx>,
    config: z.infer<TCfg>,
  ) => Promise<FraudRuleEvaluationResult>;
}) {
  return rule;
}
