import { FraudRuleType } from "@/lib/prisma/client";
import { FraudTriggeredRule } from "@/lib/types";
import * as z from "zod/v4";

export function defineFraudRule<TCfg extends z.ZodType = z.ZodTypeAny>(rule: {
  type: FraudRuleType;
  configSchema?: TCfg;
  defaultConfig?: z.infer<TCfg>;
  evaluate: (
    context: unknown,
    config?: z.infer<TCfg>,
  ) => Promise<FraudTriggeredRule>;
}) {
  return {
    ...rule,
    configSchema: rule.configSchema,
  };
}
