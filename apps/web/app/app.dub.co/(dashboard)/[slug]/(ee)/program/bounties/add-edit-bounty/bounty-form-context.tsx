"use client";

import { CreateBountyInput } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export type EndDateMode = "fixed-end-date" | "repeat-submissions";

export type CreateBountyInputExtended = CreateBountyInput & {
  rewardType?: "flat" | "custom";
  submissionCriteriaType?: "manualSubmission" | "socialMetrics";
  endDateMode?: EndDateMode;
};

export const useBountyFormContext = () =>
  useFormContext<CreateBountyInputExtended>();
