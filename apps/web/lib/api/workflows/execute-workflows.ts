import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { executeBountyWorkflow } from "./execute-bounty-workflow";

export async function executeWorkflows({
  programId,
  partnerId,
  trigger,
}: {
  programId: string;
  partnerId: string;
  trigger: WorkflowTrigger;
}) {
  const workflows = await prisma.workflow.findMany({
    where: {
      programId,
      trigger,
    },
    include: {
      bounty: true,
    },
  });

  if (workflows.length === 0) {
    console.log(`Program ${programId} has no workflows to execute.`);
    return;
  }

  await Promise.allSettled(
    workflows
      .filter((wf) => wf.bounty)
      .map((workflow) =>
        executeBountyWorkflow({
          programId,
          partnerId,
          workflow,
          bounty: workflow.bounty!,
        }),
      ),
  );
}
