"use client";

import { CreateBountyInput } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export type CreateBountyInputExtended = CreateBountyInput & {
  rewardType?: "flat" | "custom";
  submissionCriteriaType?: "manualSubmission" | "socialMetrics";
};

export const useBountyFormContext = () =>
  useFormContext<CreateBountyInputExtended>();
