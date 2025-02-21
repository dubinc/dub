"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ConfigureReward } from "@/lib/zod/schemas/program-onboarding";
import {
  COMMISSION_TYPES,
  RECURRING_MAX_DURATIONS,
} from "@/lib/zod/schemas/rewards";
import { Button, CircleCheckFill, Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useForm,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

type FormProps = {
  register: UseFormRegister<ConfigureReward>;
  watch: UseFormWatch<ConfigureReward>;
  setValue: UseFormSetValue<ConfigureReward>;
};

const PROGRAM_TYPES = [
  {
    value: "new",
    label: "New program",
    description: "Start a brand-new program",
  },
  {
    value: "import",
    label: "Import program",
    description: "Migrate an existing program",
  },
] as const;

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const [programOnboarding, _, { mutateWorkspace }] =
    useWorkspaceStore<ConfigureReward>("programOnboarding");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<ConfigureReward>({
    defaultValues: {
      programType: programOnboarding?.programType || "new",
      type: programOnboarding?.type || "flat",
      maxDuration: programOnboarding?.maxDuration ?? 0,
      amount: programOnboarding?.amount || 0,
      rewardfulApiToken: programOnboarding?.rewardfulApiToken,
      rewardfulCampaignId: programOnboarding?.rewardfulCampaignId,
    },
  });

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/programs/onboarding/rewards`);
      mutateWorkspace();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const onSubmit = async (data: ConfigureReward) => {
    if (!workspaceId) {
      return;
    }

    console.log(data);

    await executeAsync({
      ...data,
      workspaceId,
      step: "configure-reward",
    });
  };

  const programType = watch("programType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">
            Reward creation
          </h2>
          <p className="text-sm text-neutral-600">
            Create a brand new reward or import an existing program.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {PROGRAM_TYPES.map((type) => {
            const isSelected = programType === type.value;

            return (
              <label
                key={type.value}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                )}
              >
                <input
                  type="radio"
                  {...register("programType")}
                  value={type.value}
                  className="hidden"
                />
                <div className="flex grow flex-col text-sm">
                  <span className="font-medium">{type.label}</span>
                  <span>{type.description}</span>
                </div>
                <CircleCheckFill
                  className={cn(
                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                    isSelected && "scale-100 opacity-100",
                  )}
                />
              </label>
            );
          })}
        </div>
      </div>

      {programType === "import" ? (
        <ImportProgramForm
          register={register}
          watch={watch}
          setValue={setValue}
        />
      ) : (
        <NewProgramForm register={register} watch={watch} setValue={setValue} />
      )}

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting || isPending}
        disabled={isSubmitting || isPending}
      />
    </form>
  );
}

const NewProgramForm = ({ register, watch, setValue }: FormProps) => {
  const [isRecurring, setIsRecurring] = useState(false);
  const [type, maxDuration] = watch(["type", "maxDuration"]);

  useEffect(() => {
    setIsRecurring(maxDuration !== 0);
  }, [maxDuration]);

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">
            Commission structure
          </h2>
          <p className="text-sm font-normal text-neutral-600">
            Set how the affiliate will get rewarded
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {COMMISSION_TYPES.map(({ value, label, description }) => {
            const isSelected = (value === "recurring") === isRecurring;

            return (
              <label
                key={value}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                )}
              >
                <input
                  type="radio"
                  value={value}
                  className="hidden"
                  checked={isSelected}
                  onChange={(e) => {
                    if (value === "one-off") {
                      setIsRecurring(false);
                      setValue("maxDuration", 0, { shouldValidate: true });
                    }

                    if (value === "recurring") {
                      setIsRecurring(true);
                      setValue("maxDuration", 3, {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
                <div className="flex grow flex-col text-sm">
                  <span className="text-sm font-semibold text-neutral-900">
                    {label}
                  </span>
                  <span className="text-sm font-normal text-neutral-600">
                    {description}
                  </span>
                </div>
                <CircleCheckFill
                  className={cn(
                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                    isSelected && "scale-100 opacity-100",
                  )}
                />
              </label>
            );
          })}
        </div>

        {isRecurring && (
          <div>
            <label className="text-sm font-medium text-neutral-800">
              Duration
            </label>
            <select
              {...register("maxDuration", { valueAsNumber: true })}
              className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            >
              {RECURRING_MAX_DURATIONS.filter((v) => v !== 0).map(
                (duration) => (
                  <option key={duration} value={duration}>
                    {duration} {duration === 1 ? "month" : "months"}
                  </option>
                ),
              )}
              <option value="">Lifetime</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">Payout</h2>
          <p className="text-sm font-normal text-neutral-600">
            Set how much the affiliate will get rewarded
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-800">
            Payout model
          </label>
          <select
            {...register("type")}
            className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
          >
            <option value="flat">Flat</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-800">Amount</label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
              {type === "flat" && "$"}
            </span>
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                type === "flat" ? "pl-6 pr-12" : "pr-7",
              )}
              {...register("amount", {
                required: true,
                valueAsNumber: true,
                min: 0,
                max: type === "flat" ? 1000 : 100,
              })}
              onChange={handleMoneyInputChange}
              onKeyDown={handleMoneyKeyDown}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
              {type === "flat" ? "USD" : "%"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

const ImportProgramForm = ({ register, watch, setValue }: FormProps) => {
  const selectedCampaignId = watch("rewardfulCampaignId");

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-800">
          Import source
        </label>
        <div className="relative mt-2">
          <select
            className="block w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            defaultValue="rewardful"
          >
            <option value="rewardful">Rewardful</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        </div>
        <Link
          href="#"
          className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600 underline decoration-solid decoration-auto underline-offset-auto"
          target="_blank"
          rel="noopener noreferrer"
        >
          See what data is migrated
        </Link>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-800">
          Rewardful API secret
        </label>
        <Input
          {...register("rewardfulApiToken")}
          type="password"
          placeholder="API token"
          className="mt-2 max-w-full"
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          Find your Rewardful API secret on your{" "}
          <Link
            href="#"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Company settings page
          </Link>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-800">
          Campaign to import
        </label>
        <div className="relative mt-2">
          <select
            {...register("rewardfulCampaignId")}
            className="block w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
          >
            <option value="campaign2">Campaign 2</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        </div>
        <Link
          href="#"
          className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600 underline decoration-solid decoration-auto underline-offset-auto"
          target="_blank"
          rel="noopener noreferrer"
        >
          Want to migrate more than one campaign?
        </Link>
      </div>

      {selectedCampaignId && (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-neutral-300 bg-neutral-50 p-6">
          <div>
            <div className="text-sm text-neutral-500">Type</div>
            <div className="text-sm font-medium text-neutral-800">Flat</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Duration</div>
            <div className="text-sm font-medium text-neutral-800">
              24 months
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Commission</div>
            <div className="text-sm font-medium text-neutral-800">$50.00</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Affiliates</div>
            <div className="text-sm font-medium text-neutral-800">12</div>
          </div>
        </div>
      )}
    </div>
  );
};
