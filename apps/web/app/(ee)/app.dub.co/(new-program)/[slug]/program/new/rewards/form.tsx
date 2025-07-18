"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { PROGRAM_IMPORT_SOURCES } from "@/lib/partners/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { COMMISSION_TYPES } from "@/lib/zod/schemas/rewards";
import {
  Button,
  CircleCheckFill,
  InputSelect,
  InputSelectItemProps,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useFormContext,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { ImportRewardfulForm } from "./import-rewardful-form";
import { ImportToltForm } from "./import-tolt-form";

type FormProps = {
  register: UseFormRegister<ProgramData>;
  watch: UseFormWatch<ProgramData>;
  setValue: UseFormSetValue<ProgramData>;
};

export const PROGRAM_TYPES = [
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

const DEFAULT_REWARD_TYPES = [
  {
    key: "sale",
    label: "Sale",
    description: "For sales and subscriptions",
  },
  {
    key: "lead",
    label: "Lead",
    description: "For sign ups and leads",
  },
] as const;

type ImportSource = (typeof PROGRAM_IMPORT_SOURCES)[number];

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ImportSource>(
    PROGRAM_IMPORT_SOURCES[0],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const [programType, rewardful, tolt, amount] = watch([
    "programType",
    "rewardful",
    "tolt",
    "amount",
  ]);

  useEffect(() => {
    if (programType === "new") {
      setValue("rewardful", null);
      setValue("tolt", null);
    } else if (programType === "import") {
      setValue("type", null);
      setValue("amount", null);
      setValue("maxDuration", null);
    }
  }, [programType]);

  // Set the import source based on existing program data
  useEffect(() => {
    if (programType === "import") {
      if (rewardful && rewardful.id) {
        setSelectedSource(PROGRAM_IMPORT_SOURCES[0]);
      } else if (tolt && tolt.id) {
        setSelectedSource(PROGRAM_IMPORT_SOURCES[1]);
      }
    }
  }, [programType, tolt, rewardful]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/partners`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) {
      return;
    }

    setHasSubmitted(true);

    await executeAsync({
      ...data,
      amount:
        data.amount && data.type === "flat" ? data.amount * 100 : data.amount,
      workspaceId,
      step: "configure-reward",
    });
  };

  const buttonDisabled =
    isSubmitting ||
    isPending ||
    hasSubmitted ||
    (programType === "new" && !amount) ||
    (programType === "import" &&
      (!rewardful || !rewardful.id) &&
      (!tolt || !tolt.id));

  const hideContinueButton =
    programType === "import" &&
    (!rewardful || !rewardful.id) &&
    (!tolt || !tolt.id);

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

      {programType === "new" ? (
        <NewProgramForm register={register} watch={watch} setValue={setValue} />
      ) : (
        <div>
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-800">
              Import source
            </label>
            <div className="relative mt-2">
              <InputSelect
                items={
                  PROGRAM_IMPORT_SOURCES as unknown as InputSelectItemProps[]
                }
                selectedItem={selectedSource}
                setSelectedItem={setSelectedSource}
                className="w-full"
                inputAttrs={{
                  placeholder: "Select import source",
                }}
              />
            </div>

            {selectedSource && (
              <Link
                href={selectedSource.helpUrl}
                className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600 underline decoration-solid decoration-auto underline-offset-auto"
                target="_blank"
                rel="noopener noreferrer"
              >
                See what data is migrated
              </Link>
            )}
          </div>

          {selectedSource.id === "rewardful" ? (
            <ImportRewardfulForm
              register={register}
              watch={watch}
              setValue={setValue}
            />
          ) : (
            <ImportToltForm watch={watch} setValue={setValue} />
          )}
        </div>
      )}

      {!hideContinueButton && (
        <Button
          text="Continue"
          className="w-full"
          loading={isSubmitting || isPending || hasSubmitted}
          disabled={buttonDisabled}
          type="submit"
        />
      )}
    </form>
  );
}

const NewProgramForm = ({ register, watch, setValue }: FormProps) => {
  const [type, maxDuration, defaultRewardType] = watch([
    "type",
    "maxDuration",
    "defaultRewardType",
  ]);

  const [commissionStructure, setCommissionStructure] = useState<
    "one-off" | "recurring"
  >("recurring");

  useEffect(() => {
    setCommissionStructure(maxDuration === 0 ? "one-off" : "recurring");
  }, [maxDuration]);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-base font-medium text-neutral-900">
            Reward type
          </h2>
          <p className="mt-1 text-sm font-normal text-neutral-600">
            Set the default reward type for all your affiliates
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {DEFAULT_REWARD_TYPES.map(({ key, label, description }) => {
            const isSelected = key === defaultRewardType;

            return (
              <label
                key={key}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                )}
              >
                <input
                  type="radio"
                  value={key}
                  className="hidden"
                  checked={isSelected}
                  onChange={() => {
                    setValue("defaultRewardType", key, { shouldDirty: true });

                    if (key === "lead") {
                      setValue("type", "flat", { shouldDirty: true });
                      setValue("maxDuration", 0, { shouldDirty: true });
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
      </div>

      {defaultRewardType === "sale" && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-base font-medium text-neutral-900">
              Commission structure
            </h2>
            <p className="mt-1 text-sm font-normal text-neutral-600">
              Set how the affiliate will get rewarded
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {COMMISSION_TYPES.map(({ value, label, description }) => {
              const isSelected = value === commissionStructure;

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
                        setCommissionStructure("one-off");
                        setValue("maxDuration", 0, { shouldValidate: true });
                      }

                      if (value === "recurring") {
                        setCommissionStructure("recurring");
                        setValue("maxDuration", 12, {
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

          {commissionStructure === "recurring" && (
            <div>
              <label className="text-sm font-medium text-neutral-800">
                Duration
              </label>
              <select
                {...register("maxDuration", {
                  setValueAs: (v) => {
                    if (v === "" || v === null) {
                      return null;
                    }

                    return parseInt(v);
                  },
                })}
                className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
              >
                {RECURRING_MAX_DURATIONS.filter((v) => v !== 0).map(
                  (duration) => (
                    <option
                      key={duration}
                      value={duration}
                      selected={duration === 12}
                    >
                      {duration} {duration === 1 ? "month" : "months"}
                    </option>
                  ),
                )}
                <option value="">Lifetime</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-base font-medium text-neutral-900">Payout</h2>
          <p className="mt-1 text-sm font-normal text-neutral-600">
            Set how much the affiliate will get rewarded
          </p>
        </div>

        {defaultRewardType === "sale" && (
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
        )}

        <div>
          <label className="text-sm font-medium text-neutral-800">
            Amount {defaultRewardType != "sale" ? "per lead" : ""}
          </label>
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
                onChange: handleMoneyInputChange,
              })}
              onKeyDown={handleMoneyKeyDown}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
              {type === "flat" ? "USD" : "%"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
