"use client";

import { CreateBountyInput } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export type BountyTypeUI = "performance" | "submission" | "socialMetrics";

export type CreateBountyInputExtended = CreateBountyInput & {
  rewardType?: "flat" | "custom";
  bountyTypeUI?: BountyTypeUI;
};

export const useBountyFormContext = () =>
  useFormContext<CreateBountyInputExtended>();
