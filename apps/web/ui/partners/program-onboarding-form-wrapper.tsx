"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/types";
import { FormProvider, useForm } from "react-hook-form";

export function ProgramOnboardingFormWrapper({
  children,
  defaultValues,
  values,
}: {
  children: React.ReactNode;
  defaultValues?: Partial<ProgramData>;
  values?: Partial<ProgramData>;
}) {
  const [programOnboarding] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  const methods = useForm<ProgramData>({
    defaultValues: {
      linkStructure: "short",
      defaultRewardType: "sale",
      type: "percentage",
      amountInCents: null,
      amountInPercentage: null,
      maxDuration: 12,
      partners: [{ email: "" }],
      ...defaultValues,
    },
    values: programOnboarding
      ? {
          ...programOnboarding,
          linkStructure: programOnboarding.linkStructure ?? "short",
          defaultRewardType: programOnboarding.defaultRewardType ?? "sale",
          type: programOnboarding.type ?? "percentage",
          amountInCents:
            programOnboarding.amountInCents != null
              ? programOnboarding.amountInCents / 100
              : null,
          amountInPercentage:
            programOnboarding.amountInPercentage != null
              ? programOnboarding.amountInPercentage
              : null,
          partners: programOnboarding.partners?.length
            ? programOnboarding.partners
            : [{ email: "" }],
          supportEmail: programOnboarding.supportEmail || null,
          helpUrl: programOnboarding.helpUrl || null,
          termsUrl: programOnboarding.termsUrl || null,
          ...values,
        }
      : undefined,
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}
