import { tb } from "@/lib/tinybird";
import * as z from "zod/v4";
import {
  apiLogCountAggregateRowSchemaTB,
  apiLogFilterSchemaTB,
} from "./schemas";

const criticalApiFailureFilterSchemaTB = z.object({
  hour: z.string(),
});

export const criticalApiFailureRowSchema = apiLogFilterSchemaTB
  .pick({
    workspaceId: true,
    method: true,
    routePattern: true,
    statusCode: true,
  })
  .required()
  .extend({
    failureCount: apiLogCountAggregateRowSchemaTB.shape.count,
  });

type GetCriticalApiFailuresParams = z.infer<
  typeof criticalApiFailureFilterSchemaTB
>;

export async function getCriticalApiFailures({
  hour,
}: GetCriticalApiFailuresParams) {
  const pipe = tb.buildPipe({
    pipe: "get_critical_api_failures",
    parameters: criticalApiFailureFilterSchemaTB,
    data: criticalApiFailureRowSchema,
  });

  const result = await pipe({ hour: hour.slice(0, 19) });

  return z.array(criticalApiFailureRowSchema).parse(result.data);
}
