import { FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { FraudTriggeredRule } from "./types";

export function defineFraudRule<TCfg extends z.ZodType = z.ZodTypeAny>(rule: {
  type: FraudRuleType;
  defaultConfig?: z.infer<TCfg>;
  evaluate: (
    context: unknown,
    config: z.infer<TCfg>,
  ) => Promise<FraudTriggeredRule>;
}) {
  return rule;
}
