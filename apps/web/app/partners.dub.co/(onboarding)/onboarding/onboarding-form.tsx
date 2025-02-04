"use client";

import { onboardPartnerAction } from "@/lib/actions/partners/onboard-partner";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { Partner } from "@dub/prisma/client";
import {
  Button,
  buttonVariants,
  Combobox,
  FileUpload,
  useEnterSubmit,
  useMediaQuery,
} from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

export function OnboardingForm({
  partner,
}: {
  partner: Pick<Partner, "bio" | "country" | "image"> | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { isMobile } = useMediaQuery();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<z.infer<typeof onboardPartnerSchema>>({
    defaultValues: {
      description: partner?.bio ?? undefined,
      country: partner?.country ?? undefined,
      image: partner?.image ?? undefined,
    },
  });

  useEffect(() => {
    if (session?.user) {
      setValue("name", session.user.name ?? "");
      setValue("email", session.user.email ?? "");
    }
  }, [session?.user]);

  const { executeAsync, isPending } = useAction(onboardPartnerAction, {
    onSuccess: () => {
      if (watch("country") === "US") {
        router.push("/onboarding/verify");
      } else {
        router.push("/programs");
      }
    },
    onError: ({ error, input }) => {
      toast.error(error.serverError);
      reset(input);
    },
  });

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(executeAsync)}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">
          Full Name
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
        <span className="text-sm font-medium text-gray-800">
          Email
          <span className="font-normal text-neutral-500"> (required)</span>
        </span>
        <input
          type="text"
          disabled
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 sm:text-sm",
            errors.email
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          {...register("email", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          Display Image
          <span className="font-normal text-neutral-500"> (required)</span>
        </span>
        <div className="flex items-center gap-5">
          <Controller
            control={control}
            name="image"
            rules={{ required: true }}
            render={({ field }) => (
              <FileUpload
                accept="images"
                className={cn(
                  "mt-2 size-20 rounded-md border border-gray-300",
                  errors.image && "border-0 ring-2 ring-red-500",
                )}
                iconClassName="w-5 h-5"
                previewClassName="size-10 rounded-full"
                variant="plain"
                imageSrc={field.value}
                readFile
                onChange={({ src }) => field.onChange(src)}
                content={null}
                maxFileSizeMB={2}
                targetResolution={{ width: 160, height: 160 }}
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
          rules={{ required: true }}
          render={({ field }) => <CountryCombobox {...field} />}
        />
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
          onKeyDown={handleKeyDown}
          {...register("description")}
        />
      </label>

      <Button
        type="submit"
        text="Create partner account"
        className="mt-2"
        loading={isPending || isSubmitting || isSubmitSuccessful}
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
            src={`https://hatscripts.github.io/circle-flags/flags/${key.toLowerCase()}.svg`}
            className="mr-1.5 size-4"
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
            src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
            className="mr-0.5 size-4"
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
