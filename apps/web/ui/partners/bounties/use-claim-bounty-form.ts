"use client";

import { createBountySubmissionInputSchema } from "@/lib/zod/schemas/bounties";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { useClaimBountyContext } from "./claim-bounty-context";

export type CreateBountySubmissionInput = z.infer<
  typeof createBountySubmissionInputSchema
>;

export function useClaimBountyForm() {
  const form = useFormContext<CreateBountySubmissionInput>();
  const claim = useClaimBountyContext();

  return {
    ...form,
    ...claim,
  };
}
