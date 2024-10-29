"use client";

import { onboardPartner } from "@/lib/actions/partners/onboard-partner";
import { Button, Combobox, FileUpload, useMediaQuery } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function OnboardingForm() {
  const { isMobile } = useMediaQuery();
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<{
    name: string;
    logo: string;
    country: string;
    description: string;
  }>();

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const result = await onboardPartner(data);
          if (!result?.data?.ok) throw new Error("Failed to create partner");
          router.push(`/${result?.data?.partnerId || ""}`);
        } catch (error) {
          console.error(error);
          setError("root.serverError", {
            message: "Failed to create partner profile. Please try again.",
          });
          toast.error("Failed to create partner profile. Please try again.");
        }
      })}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">
          Name
          <span className="ml-0.5 text-red-600/60">*</span>
        </span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          placeholder="Acme, Inc."
          autoFocus={!isMobile}
          {...register("name", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Logo</span>
        <Controller
          control={control}
          name="logo"
          render={({ field }) => (
            <FileUpload
              accept="images"
              className="mt-2 h-14 w-full rounded-md border border-gray-300"
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
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Country</span>
        <Controller
          control={control}
          name="country"
          render={({ field }) => <CountryCombobox {...field} />}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Description</span>
        <textarea
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          placeholder="Tell us about your business"
          {...register("description")}
        />
      </label>

      <Button
        type="submit"
        text="Create partner account"
        className="mt-2"
        loading={isSubmitting || isSubmitSuccessful}
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
