import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Workflow } from "@prisma/client";
import { parseWorkflowConfig } from "./parse-workflow-config";

export async function scheduleWorkflow(workflow: Workflow | null) {
  if (!workflow || workflow.disabledAt) {
    return;
  }

  const { condition } = parseWorkflowConfig(workflow);

  // Skip scheduling if the condition is not based on partnerEnrolledDays,
  // or if the required enrolled days is 0 (immediate execution case)
  if (condition.attribute !== "partnerEnrolledDays" || condition.value === 0) {
    return;
  }

  const response = await qstash.schedules.create({
    destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${workflow.id}`,
    cron: "0 */12 * * *", // Every 12 hours
  });

  console.log(response);

  return response;
}
