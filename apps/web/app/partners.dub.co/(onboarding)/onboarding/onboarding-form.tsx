"use client";

import { onboardPartnerAction } from "@/lib/actions/partners/onboard-partner";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import {
  Button,
  buttonVariants,
  Combobox,
  FileUpload,
  useMediaQuery,
} from "@dub/ui";
import { COUNTRIES, COUNTRY_PHONE_CODES } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

type OnboardingFormData = z.infer<typeof onboardPartnerSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<OnboardingFormData>();

  const { executeAsync, isExecuting } = useAction(onboardPartnerAction, {
    onSuccess: ({ data }) => {
      if (!data?.partnerId) {
        toast.error("Failed to create partner profile. Please try again.");
        return;
      }

      router.push(`/${data.partnerId}`);
    },
    onError: ({ error, input }) => {
      toast.error(error.serverError?.serverError);
      reset(input);
    },
  });

  const countryCode = COUNTRY_PHONE_CODES[watch("country")];

  return (
    <form
      onSubmit={handleSubmit(executeAsync)}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">
          Name
          <span className="font-normal text-neutral-500"> (required)</span>
        </span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          autoFocus={!isMobile}
          {...register("name", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Logo</span>
        <div className="flex items-center gap-5">
          <Controller
            control={control}
            name="logo"
            render={({ field }) => (
              <FileUpload
                accept="images"
                className="mt-2 size-20 rounded-md border border-gray-300"
                iconClassName="w-5 h-5"
                previewClassName="size-10 rounded-full"
                variant="plain"
                imageSrc={field.value}
                readFile
                onChange={({ src }) => field.onChange(src)}
                content={null}
                maxFileSizeMB={2}
              />
            )}
          />
          <div>
            <div
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 w-fit cursor-pointer items-center rounded-md border px-2 text-xs",
              )}
            >
              Upload image
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Recommended size: 160x160px
            </p>
          </div>
        </div>
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          Country
          <span className="font-normal text-neutral-500"> (required)</span>
        </span>
        <Controller
          control={control}
          name="country"
          render={({ field }) => <CountryCombobox {...field} />}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          Mobile number
          <span className="font-normal text-neutral-500"> (required)</span>
        </span>
        <div
          className={cn(
            "relative mt-2 flex items-center rounded-md border border-neutral-300 bg-white shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
            errors.phoneNumber &&
              "border-red-600 focus-within:border-red-500 focus-within:ring-red-600",
          )}
        >
          {countryCode && (
            <span className="left-0 flex items-center pl-2.5 text-sm text-neutral-400">
              +{countryCode}
            </span>
          )}
          <input
            className={cn(
              "block w-full border-none bg-transparent text-neutral-900 placeholder-neutral-400 sm:text-sm",
              "focus:border-none focus:outline-none focus:ring-0",
              countryCode && "pl-1",
            )}
            type="tel"
            {...register("phoneNumber", {
              required: true,
            })}
          />
        </div>
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Description</span>
        <ReactTextareaAutosize
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.description
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          placeholder="Tell us about the kind of content you create – e.g. tech, travel, fashion, etc."
          minRows={3}
          {...register("description")}
        />
      </label>

      <Button
        type="submit"
        text="Create partner account"
        className="mt-2"
        loading={isExecuting || isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}

function CountryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = useMemo(
    () =>
      Object.entries(COUNTRIES).map(([key, value]) => ({
        icon: (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${key}.svg`}
            className="mr-1 h-2.5 w-4"
          />
        ),
        value: key,
        label: value,
      })),
    [],
  );

  return (
    <Combobox
      selected={options.find((o) => o.value === value) ?? null}
      setSelected={(option) => {
        if (!option) return;
        onChange(option.value);
      }}
      options={options}
      icon={
        value ? (
          <img
            alt={COUNTRIES[value]}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ) : undefined
      }
      caret={true}
      placeholder="Select country"
      searchPlaceholder="Search countries..."
      matchTriggerWidth
      buttonProps={{
        className: cn(
          "mt-2 w-full justify-start border-gray-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
          "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
          !value && "text-gray-400",
        ),
      }}
    />
  );
}
