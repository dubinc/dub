"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/types";
import { FormProvider, useForm } from "react-hook-form";

export function FormWrapper({ children }: { children: React.ReactNode }) {
  const [programOnboarding] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  const methods = useForm<ProgramData>({
    defaultValues: {
      linkType: "short",
      programType: "new",
      type: "flat",
      amount: null,
      partners: [{ email: "", key: "" }],
    },
    values: programOnboarding
      ? {
          ...programOnboarding,
          linkType: programOnboarding.linkType ?? "short",
          programType: programOnboarding.programType ?? "new",
          type: programOnboarding.type ?? "flat",
          amount: programOnboarding.amount ?? null,
          partners: programOnboarding.partners?.length
            ? programOnboarding.partners
            : [{ email: "", key: "" }],
        }
      : undefined,
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}
