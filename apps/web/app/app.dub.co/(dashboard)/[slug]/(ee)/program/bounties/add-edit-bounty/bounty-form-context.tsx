"use client";

import { BountyFormData } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export type BountyFormDataExtended = BountyFormData & {
  rewardType?: "flat" | "custom";
  submissionCriteriaType?: "manualSubmission" | "socialMetrics";
};

export const useAddEditBountyForm = () =>
  useFormContext<BountyFormDataExtended>();
