"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/zod/schemas/program-onboarding";
import { FormProvider, useForm } from "react-hook-form";

export function FormWrapper({ children }: { children: React.ReactNode }) {
  const [programOnboarding] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  const methods = useForm<ProgramData>({
    defaultValues: {
      ...programOnboarding,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}
