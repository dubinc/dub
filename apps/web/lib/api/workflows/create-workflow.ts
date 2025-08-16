import { ProgramProps } from "@/lib/types";
import { createWorkflowSchema } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { createId } from "../create-id";

export const createWorkflow = async ({
  workflow,
  program,
}: {
  workflow: z.input<typeof createWorkflowSchema>;
  program: Pick<ProgramProps, "id">;
}) => {
  return await prisma.workflow.create({
    data: {
      id: createId({ prefix: "wf_" }),
      programId: program.id,
      trigger: workflow.trigger,
      triggerConditions: workflow.triggerConditions,
      actions: workflow.actions,
    },
  });
};
