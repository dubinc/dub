import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

export const createWorkflowSchema = z.object({
  trigger: z.nativeEnum(WorkflowTrigger),
  triggerConditions: z.any(),
  actions: z.any(),
});
