"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { RewardfulCampaign } from "@/lib/rewardful/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { programRewardSchema } from "@/lib/zod/schemas/program-onboarding";
import {
  COMMISSION_TYPES,
  RECURRING_MAX_DURATIONS,
} from "@/lib/zod/schemas/rewards";
import { Button, CircleCheckFill, Input, InputSelect } from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { fetcher } from "@dub/utils/src";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  useFormContext,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import { z } from "zod";

// TODO:
// Convert this to use context

type Form = z.infer<typeof programRewardSchema>;

type FormProps = {
  register: UseFormRegister<Form>;
  watch: UseFormWatch<Form>;
  setValue: UseFormSetValue<Form>;
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

const IMPORT_SOURCES = [
  {
    id: "rewardful",
    value: "Rewardful",
    image: "https://assets.dub.co/misc/icons/rewardful.svg",
  },
];

const useRewardfulCampaigns = (apiToken?: string) => {
  const { data, error } = useSWR<RewardfulCampaign[]>(
    apiToken ? `/api/programs/rewardful/campaigns?token=${apiToken}` : null,
    fetcher,
  );

  return {
    campaigns: data || [],
    loading: !data && !error,
    error,
  };
};

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [_, __, { mutateWorkspace }] = useWorkspaceStore<Form>("programOnboarding");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<Form>();

  const [programType, rewardful] = watch(["programType", "rewardful"]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      mutateWorkspace();
      router.push(`/${workspaceSlug}/programs/new/partners`);
    },
    onError: ({ error }) => {
      console.log(error);
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: Form) => {
    if (!workspaceId) return;

    if (
      programType === "import" &&
      rewardful?.apiToken &&
      !rewardful?.campaign?.id
    ) {
      return;
    }

    const programData = {
      ...data,
      ...(programType === "new" && {
        rewardful: null,
      }),
      ...(programType === "import" && {
        type: null,
        amount: null,
        maxDuration: null,
      }),
    };

    await executeAsync({
      ...programData,
      workspaceId,
      step: "configure-reward",
    });
  };

  const buttonDisabled =
    isSubmitting ||
    isPending ||
    (programType === "import" &&
      (!rewardful?.apiToken || !rewardful?.campaign?.id));

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
        <ImportProgramForm
          register={register}
          watch={watch}
          setValue={setValue}
        />
      )}

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting || isPending}
        disabled={buttonDisabled}
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
  const rewardful = watch("rewardful");
  const { campaigns } = useRewardfulCampaigns(rewardful?.apiToken);
  const [selectedSource, setSelectedSource] = useState(IMPORT_SOURCES[0]);

  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === rewardful?.campaign?.id,
  );

  useEffect(() => {
    if (selectedCampaign) {
      setValue("rewardful.campaign", selectedCampaign);
    }
  }, [selectedCampaign, setValue]);

  const formatCommission = useCallback((campaign: RewardfulCampaign) => {
    return campaign.reward_type === "percent"
      ? `${campaign.commission_percent}%`
      : `$${(campaign.commission_amount_cents / 100).toFixed(2)}`;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-800">
          Import source
        </label>
        <div className="relative mt-2">
          <InputSelect
            items={IMPORT_SOURCES}
            selectedItem={selectedSource}
            setSelectedItem={setSelectedSource}
            className="w-full"
            inputAttrs={{
              placeholder: "Select import source",
            }}
          />
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
          {...register("rewardful.apiToken")}
          type="password"
          placeholder="API token"
          className="mt-2 max-w-full"
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          Find your Rewardful API secret on your{" "}
          <Link
            href="https://app.getrewardful.com/company/edit"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Company settings page
          </Link>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div>
          <label className="text-sm font-medium text-neutral-800">
            Campaign to import
          </label>
          <div className="relative mt-2">
            <select
              {...register("rewardful.campaign.id")}
              className="block w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            >
              <option value="">Select a campaign</option>
              {campaigns.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
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
      )}

      {selectedCampaign && (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-neutral-300 bg-neutral-50 p-6">
          <div>
            <div className="text-sm text-neutral-500">Type</div>
            <div className="text-sm font-medium text-neutral-800">
              {capitalize(selectedCampaign.reward_type)}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Duration</div>
            <div className="text-sm font-medium text-neutral-800">
              {selectedCampaign.max_commission_period_months} months
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Commission</div>
            <div className="text-sm font-medium text-neutral-800">
              {formatCommission(selectedCampaign)}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Affiliates</div>
            <div className="text-sm font-medium text-neutral-800">
              {selectedCampaign.affiliates}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
