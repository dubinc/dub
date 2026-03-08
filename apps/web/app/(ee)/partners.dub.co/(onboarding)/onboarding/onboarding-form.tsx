"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { onboardPartnerAction } from "@/lib/actions/partners/onboard-partner";
import { getValidInternalRedirectPath } from "@/lib/middleware/utils/is-valid-internal-redirect";
import { onboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { useCountryChangeWarningModal } from "@/ui/partners/use-country-change-warning-modal";
import { Partner } from "@dub/prisma/client";
import {
  Button,
  FileUpload,
  ToggleGroup,
  TooltipContent,
  useEnterSubmit,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import * as z from "zod/v4";

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
      | "payoutsEnabledAt"
    >
  > | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useMediaQuery();
  const [accountCreated, setAccountCreated] = useState(false);
  const [isCountryComboboxOpen, setIsCountryComboboxOpen] = useState(false);
  const { data: session, update: refreshSession } = useSession();
  const countryChangeWarning = useCountryChangeWarningModal();

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
  }, [session?.user, name, image, setValue]);

  // refresh the session after the Partner account is created
  useEffect(() => {
    if (accountCreated) {
      refreshSession();
    }
  }, [accountCreated, refreshSession]);

  const { executeAsync, isPending } = useAction(onboardPartnerAction, {
    onSuccess: () => {
      setAccountCreated(true);
      const next = getValidInternalRedirectPath({
        redirectPath: searchParams.get("next"),
        currentUrl: window.location.href,
      });
      router.push(
        `/onboarding/platforms${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      );
    },
    onError: ({ error, input }) => {
      toast.error(parseActionError(error, "An unknown error occurred."));
      reset(input);
    },
  });

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(async (data) => await executeAsync(data))}
      className="flex w-full flex-col gap-6 text-left"
    >
      {countryChangeWarning.modal}
      <label>
        <span className="text-sm font-medium text-neutral-800">Name</span>
        <input
          type="text"
          className={cn(
            "mt-1.5 block w-full rounded-md read-only:bg-neutral-100 read-only:text-neutral-500 focus:outline-none sm:text-sm",
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
          Profile image
        </span>
        <div className="flex items-center gap-5">
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <FileUpload
                accept="images"
                className="mt-1.5 size-20 rounded-full border border-neutral-300"
                iconClassName="size-5"
                previewClassName="size-20 rounded-full"
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
            <p className="text-xs text-neutral-500">
              Square image recommended, up to 2 MB.
            </p>
            <p className="mt-0.5 text-xs font-medium text-neutral-500">
              Adding an image can improve your approval rates.
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
            <CountryCombobox
              {...field}
              error={errors.country ? true : false}
              open={isCountryComboboxOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsCountryComboboxOpen(false);
                  return;
                }

                const shouldShowCountryChangeWarning =
                  !partner?.payoutsEnabledAt;

                if (shouldShowCountryChangeWarning) {
                  countryChangeWarning.acknowledgeAndContinue(() => {
                    setIsCountryComboboxOpen(true);
                  });
                  return;
                }

                setIsCountryComboboxOpen(true);
              }}
              disabledTooltip={
                partner?.payoutsEnabledAt ? (
                  <TooltipContent
                    title="Since you've already connected your bank account for payouts, you cannot change your profile country."
                    cta="Contact support"
                    href="https://dub.co/support"
                    target="_blank"
                  />
                ) : undefined
              }
            />
          )}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">
          Description
          <span className="font-normal text-neutral-500"> (optional)</span>
        </span>
        <ReactTextareaAutosize
          className={cn(
            "mt-1.5 block w-full rounded-md focus:outline-none sm:text-sm",
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
          <div className="mt-1.5">
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
                if (!partner?.payoutsEnabledAt) {
                  setValue("profileType", option);
                }
              }}
              className={cn(
                "flex w-full items-center gap-0.5 rounded-lg border-neutral-300 bg-neutral-100 p-0.5",
                partner?.payoutsEnabledAt && "cursor-not-allowed opacity-70",
              )}
              optionClassName={cn(
                "h-9 flex items-center justify-center rounded-lg flex-1",
                partner?.payoutsEnabledAt && "pointer-events-none",
              )}
              indicatorClassName="bg-white"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              You can update this later in your partner profile settings.
            </p>
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
                    "mt-1.5 block w-full rounded-md read-only:bg-neutral-100 read-only:text-neutral-500 focus:outline-none sm:text-sm",
                    errors.companyName
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  )}
                  readOnly={!!partner?.companyName || !!errors.companyName}
                  {...register("companyName", {
                    required: profileType === "company",
                  })}
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout>
          <Button
            type="submit"
            text="Continue"
            className="mt-1.5"
            loading={isPending || isSubmitting || isSubmitSuccessful}
          />
        </motion.div>
      </LayoutGroup>
    </form>
  );
}
