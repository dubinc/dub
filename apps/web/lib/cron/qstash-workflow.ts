// import { logger, toErrorFields } from "@/lib/axiom/server";
// import { APP_DOMAIN, pluralize } from "@dub/utils";
// import { FlowControl } from "@upstash/qstash";
// import { Client } from "@upstash/workflow";

// export const workflow = new Client({
//   baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
//   token: process.env.QSTASH_TOKEN || "",
//   ...(process.env.VERCEL_ENV === "preview" && {
//     headers: {
//       "x-vercel-protection-bypass":
//         process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
//     },
//   }),
// });

// type WorkflowType =
//   | "partner-approved"
//   | "create-partner-commission"
//   | "merge-partner-accounts";

// interface QStashWorkflow {
//   workflowType: WorkflowType;
//   workflowLabel: string;
//   body: Record<string, unknown>;
//   flowControl?: FlowControl;
// }

// // Run workflows
// export async function triggerQStashWorkflow(
//   input: QStashWorkflow | QStashWorkflow[],
// ) {
//   const workflows = Array.isArray(input) ? input : [input];
//   const maxRetries = 3;

//   for (let attempt = 0; attempt <= maxRetries; attempt++) {
//     try {
//       const response = await workflow.trigger(
//         workflows.map((item) => ({
//           url: `${APP_DOMAIN}/api/workflows/${item.workflowType}`,
//           body: item.body,
//           label: item.workflowLabel,
//           retries: 5,
//           flowControl: item.flowControl ?? {
//             key: item.workflowType,
//             parallelism: 15,
//           },
//         })),
//       );

//       console.log(
//         `${response.length} QStash ${pluralize("workflow", response.length)} triggered`,
//         response,
//       );

//       return response;
//     } catch (error) {
//       console.error("QStash workflow trigger failed", { error, workflows });

//       if (attempt < maxRetries) {
//         await new Promise((resolve) =>
//           setTimeout(resolve, 1000 * Math.pow(2, attempt)),
//         );
//         continue;
//       }

//       for (const workflow of workflows) {
//         const { correlation } = getWorkflowConfig(workflow);

//         logger.error("workflow.trigger_failed", {
//           service: "qstash",
//           event: "workflow.trigger_failed",
//           workflowType: workflow.workflowType,
//           error: toErrorFields(error),
//           correlation,
//         });
//       }

//       await logger.flush();

//       return null;
//     }
//   }
// }

// export function getWorkflowConfig({
//   workflowType,
//   body,
// }: Omit<QStashWorkflow, "workflowLabel">): {
//   correlation: Record<string, unknown>;
// } {
//   switch (workflowType) {
//     case "partner-approved":
//       return {
//         correlation: {
//           programId: body.programId,
//           partnerId: body.partnerId,
//           userId: body.userId,
//         },
//       };

//     case "create-partner-commission": {
//       return {
//         correlation: {
//           programId: body.programId,
//           partnerId: body.partnerId,
//           customerId: body.customerId,
//           bountySubmissionId: body.bountySubmissionId,
//         },
//       };
//     }

//     case "merge-partner-accounts": {
//       return {
//         correlation: {
//           userId: body.userId,
//           sourceEmail: body.sourceEmail,
//           targetEmail: body.targetEmail,
//         },
//       };
//     }

//     default:
//       return {
//         correlation: {},
//       };
//   }
// }
