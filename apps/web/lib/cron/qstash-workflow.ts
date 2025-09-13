import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Client } from "@upstash/workflow";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

type WorkflowIds = "partner-approved";

type TriggerWorkflow = {
  workflowId: `${WorkflowIds}`;
  body?: Record<string, any>;
};

export async function triggerWorkflow(params: TriggerWorkflow) {
  try {
    const { workflowRunId } = await client.trigger({
      url: `${APP_DOMAIN_WITH_NGROK}/api/workflows/${params.workflowId}`,
      body: params.body,
      retries: 3,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[Upstash] Workflow triggered successfully`, {
        workflowRunId,
        ...params,
      });
    }

    return workflowRunId;
  } catch (error) {
    console.error(`[Upstash] ${error.message}`, params);

    await log({
      message: `[Upstash] failed to trigger the workflow ${params.workflowId}. ${error.message}`,
      type: "errors",
    });

    return null;
  }
}
