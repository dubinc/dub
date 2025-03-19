"use client";

import { onboardPartnerAction } from "@/lib/actions/partners/onboard-partner";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { Partner } from "@dub/prisma/client";
import {
  Button,
  buttonVariants,
  Combobox,
  FileUpload,
  ToggleGroup,
  useEnterSubmit,
  useMediaQuery,
} from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.infer<typeof onboardPartnerSchema>;

export function OnboardingForm({
  partner,
}: {
  partner?: Partial<
    Pick<
      Partner,
      | "name"
      | "description"
      | "country"
      | "image"
      | "profileType"
      | "companyName"
      | "stripeConnectId"
    >
  > | null;
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
  } = useForm<FormData>({
    defaultValues: {
      name: partner?.name ?? undefined,
      description: partner?.description ?? undefined,
      country: partner?.country ?? undefined,
      image: partner?.image ?? undefined,
      profileType: partner?.profileType ?? "individual",
      companyName: partner?.companyName ?? undefined,
    },
  });

  const { name, image, profileType } = watch();

  useEffect(() => {
    if (session?.user) {
      !name && setValue("name", session.user.name ?? "");
      !image && setValue("image", session.user.image ?? "");
    }
  }, [session?.user, name, image]);

  const { executeAsync, isPending } = useAction(onboardPartnerAction, {
    onSuccess: () => {
      router.push("/onboarding/online-presence");
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
      onSubmit={handleSubmit(async (data) => await executeAsync(data))}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-neutral-800">Full Name</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md read-only:bg-neutral-100 read-only:text-neutral-500 focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          autoFocus={!isMobile && !errors.name}
          {...register("name", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">
          Profile Image
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
                  "mt-2 size-20 rounded-full border border-neutral-300",
                  errors.image && "border-0 ring-2 ring-red-500",
                )}
                iconClassName="size-5"
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
            <p className="mt-1.5 text-xs text-neutral-500">
              Recommended size: 160x160px
            </p>
          </div>
        </div>
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">Country</span>
        <Controller
          control={control}
          name="country"
          rules={{ required: true }}
          render={({ field }) => (
            // Disable the combobox if the partner already has a stripeConnectId
            <CountryCombobox
              {...field}
              disabled={!!partner?.stripeConnectId}
              error={errors.country ? true : false}
            />
          )}
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Your country cannot be changed once set.
        </p>
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">
          Description
          <span className="font-normal text-neutral-500"> (optional)</span>
        </span>
        <ReactTextareaAutosize
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.description
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="Tell us about the kind of content you create – e.g. tech, travel, fashion, etc."
          minRows={3}
          onKeyDown={handleKeyDown}
          {...register("description")}
        />
      </label>

      <LayoutGroup>
        <div>
          <span className="text-sm font-medium text-neutral-800">
            Profile Type
          </span>
          <div className="mt-2">
            <ToggleGroup
              options={[
                {
                  value: "individual",
                  label: "Individual",
                },
                {
                  value: "company",
                  label: "Company",
                },
              ]}
              selected={profileType}
              selectAction={(option: "individual" | "company") => {
                if (!partner?.stripeConnectId) {
                  setValue("profileType", option);
                }
              }}
              className={cn(
                "flex w-full items-center gap-0.5 rounded-lg border-neutral-300 bg-neutral-100 p-0.5",
                partner?.stripeConnectId && "cursor-not-allowed opacity-70",
              )}
              optionClassName={cn(
                "h-9 flex items-center justify-center rounded-lg flex-1",
                partner?.stripeConnectId && "pointer-events-none",
              )}
              indicatorClassName="bg-white"
            />
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {profileType === "company" && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                opacity: { duration: 0.2 },
                layout: { duration: 0.3, type: "spring" },
              }}
            >
              <label>
                <span className="text-sm font-medium text-neutral-800">
                  Legal company name
                </span>
                <input
                  type="text"
                  className={cn(
                    "mt-2 block w-full rounded-md read-only:bg-neutral-100 read-only:text-neutral-500 focus:outline-none sm:text-sm",
                    errors.companyName
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  )}
                  readOnly={!!partner?.companyName || !!errors.companyName}
                  {...register("companyName", {
                    required: profileType === "company",
                  })}
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  This cannot be changed once set.
                </p>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout>
          <Button
            type="submit"
            text="Continue"
            className="mt-2"
            loading={isPending || isSubmitting || isSubmitSuccessful}
          />
        </motion.div>
      </LayoutGroup>
    </form>
  );
}

function CountryCombobox({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
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
          "mt-2 w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          !value && "text-neutral-400",
          disabled && "cursor-not-allowed",
          error && "border-red-500 ring-red-500 ring-1",
        ),
        disabled,
      }}
    />
  );
}
