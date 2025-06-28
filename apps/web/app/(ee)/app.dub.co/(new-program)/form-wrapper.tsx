"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/types";
import { FormProvider, useForm } from "react-hook-form";

export function FormWrapper({ children }: { children: React.ReactNode }) {
  const [programOnboarding] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  const methods = useForm<ProgramData>({
    defaultValues: {
      linkStructure: "short",
      programType: "new",
      defaultRewardType: "sale",
      type: "percentage",
      amount: null,
      maxDuration: 12,
      partners: [{ email: "" }],
    },
    values: programOnboarding
      ? {
          ...programOnboarding,
          linkStructure: programOnboarding.linkStructure ?? "short",
          defaultRewardType: programOnboarding.defaultRewardType ?? "sale",
          programType: programOnboarding.programType ?? "new",
          type: programOnboarding.type ?? "percentage",
          amount: programOnboarding.amount ?? null,
          partners: programOnboarding.partners?.length
            ? programOnboarding.partners
            : [{ email: "" }],
          supportEmail: programOnboarding.supportEmail || null,
          helpUrl: programOnboarding.helpUrl || null,
          termsUrl: programOnboarding.termsUrl || null,
        }
      : undefined,
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}
