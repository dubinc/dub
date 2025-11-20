import { FraudTriggeredRule } from "@/lib/types";
import { FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";

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
