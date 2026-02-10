"use client";

import { BountyFormData } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export const useAddEditBountyForm = () => useFormContext<BountyFormData>();
