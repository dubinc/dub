"use client";

import { createBountySubmissionInputSchema } from "@/lib/zod/schemas/bounties";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";

export type CreateBountySubmissionInput = z.infer<
  typeof createBountySubmissionInputSchema
>;

export function useClaimBountyForm() {
  return useFormContext<CreateBountySubmissionInput>();
}
