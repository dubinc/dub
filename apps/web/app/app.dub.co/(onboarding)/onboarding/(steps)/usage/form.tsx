"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { OnboardingUsageSchema } from "@/lib/zod/schemas/workspaces";
import { Markdown } from "@/ui/shared/markdown";
import { Button } from "@dub/ui";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod/v4";
import { useOnboardingProgress } from "../../use-onboarding-progress";
import { getRecommendedPlan } from "./get-recommended-plan";

type FormData = z.infer<typeof OnboardingUsageSchema>;

export function Form() {
  const { continueTo } = useOnboardingProgress();

  const workspace = useWorkspace();
  const [_, setItem] = useWorkspaceStore<FormData>("onboardingUsage");

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    defaultValues: {
      links: 1_000,
      clicks: 50_000,
      conversions: false,
      partners: false,
    },
  });

  return (
    <div>
      <form
        onSubmit={handleSubmit(async (data) => {
          let recommendedPlan: string | undefined;
          if (workspace) {
            try {
              await setItem(data);
            } catch (error) {
              console.error(
                "Failed to save usage answers to workspace store",
                error,
              );
            }
          }

          recommendedPlan = getRecommendedPlan(data);
          continueTo("plan", { params: { plan: recommendedPlan } });
        })}
        className="flex flex-col gap-8"
      >
        <Controller
          control={control}
          name="links"
          render={({ field }) => (
            <RadioGroup
              label="How many [links](https://dub.co/help/article/how-to-create-link) do you create per month?"
              options={[
                { id: 1_000, label: "1K or less" },
                { id: 10_000, label: "10K" },
                { id: 50_000, label: "50K" },
              ]}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="clicks"
          render={({ field }) => (
            <RadioGroup
              label="How many [clicks](https://dub.co/help/article/dub-analytics) do your links get per month?"
              options={[
                { id: 50_000, label: "50K or less" },
                { id: 250_000, label: "250K" },
                { id: 1_000_000, label: "1M" },
              ]}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="conversions"
          render={({ field }) => (
            <RadioGroup
              label="Do you want to [track conversions](https://dub.co/help/article/dub-conversions) on your links?"
              options={[
                { id: false, label: "No" },
                { id: true, label: "Yes" },
              ]}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="partners"
          render={({ field }) => (
            <RadioGroup
              label="Do you want to create a [partner program](https://dub.co/help/article/dub-partners)?"
              options={[
                { id: false, label: "No" },
                { id: true, label: "Yes" },
              ]}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          )}
        />

        <Button
          type="submit"
          text="Continue"
          loading={isSubmitting || isSubmitSuccessful}
        />
      </form>
    </div>
  );
}

function RadioGroup<T extends string>({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label?: string;
  options: { id: T; label: string }[];
  selectedId: T;
  onSelect: (id: T) => void;
}) {
  const id = useId();

  return (
    <div>
      {label && (
        <Markdown className="prose-a:underline-offset-2 mb-1.5 text-sm font-medium">
          {label}
        </Markdown>
      )}
      <div
        className="relative z-0 grid rounded-md border border-neutral-300 bg-neutral-100 p-0.5"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        <LayoutGroup id={`lg-${id}`}>
          {options.map((option) => (
            <label
              key={option.id}
              className="group relative flex cursor-pointer items-center justify-center gap-2 px-4 py-2"
            >
              <input
                type="radio"
                name={id}
                value={option.id}
                className="peer sr-only"
                checked={option.id === selectedId}
                onChange={() => onSelect(option.id)}
              />
              {option.id === selectedId && (
                <motion.div
                  layoutId="indicator"
                  transition={{
                    duration: 0.1,
                  }}
                  className="absolute inset-0 rounded border border-neutral-300 bg-white"
                />
              )}
              <span className="relative z-10 text-sm font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 peer-checked:text-neutral-900">
                {option.label}
              </span>
            </label>
          ))}
        </LayoutGroup>
      </div>
    </div>
  );
}
