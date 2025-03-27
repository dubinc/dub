"use client";

import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps, PayoutsCount } from "@/lib/types";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import {
  Button,
  buttonVariants,
  FileUpload,
  LoadingSpinner,
  MaxWidthWrapper,
  ToggleGroup,
  useEnterSubmit,
} from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { PartnerProfileType } from "@prisma/client";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { PropsWithChildren, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

export function ProfileSettingsPageClient() {
  const { partner, error } = usePartnerProfile();

  return (
    <MaxWidthWrapper className="mb-20 flex flex-col gap-8">
      <div className="max-w-screen-md rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-neutral-800">About you</h2>
          </div>
        </div>

        {partner ? (
          <ProfileForm partner={partner} />
        ) : (
          <div className="flex h-32 w-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load profile data
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>

      <div
        className="max-w-screen-md rounded-lg border border-neutral-200 bg-white"
        id="online-presence"
      >
        <div className="border-b border-neutral-200 p-6">
          <h2 className="text-xl font-medium text-neutral-800">
            Online presence
          </h2>
          <p className="text-sm text-neutral-700">
            These improve your reputation score and rank you higher.{" "}
          </p>
        </div>
        {partner ? (
          <OnlinePresenceForm
            partner={partner}
            variant="settings"
            onSubmitSuccessful={() => {
              toast.success("Online presence updated successfully.");
            }}
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load online presence data
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
}

function ProfileForm({ partner }: { partner: PartnerProps }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{
    name: string;
    image: string | null;
    description: string | null;
    country: string;
    profileType: PartnerProfileType;
    companyName: string | null;
  }>({
    defaultValues: {
      name: partner.name,
      image: partner.image,
      description: partner.description ?? null,
      country: partner.country ?? "",
      profileType: partner.profileType ?? "individual",
      companyName: partner.companyName ?? null,
    },
  });

  const { profileType } = watch();

  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const sentPayoutsCount =
    payoutsCount?.find(
      (payout) =>
        payout.status === "processing" || payout.status === "completed",
    )?.count ?? 0;

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  const { executeAsync, isPending } = useAction(updatePartnerProfileAction, {
    onSuccess: async () => {
      toast.success("Profile updated successfully.");
    },
    onError({ error }) {
      setError("root.serverError", {
        message: error.serverError,
      });

      toast.error(error.serverError);
    },
  });

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(async (data) => {
        await executeAsync(data);
      })}
    >
      <div className="px-5">
        <div className="grid grid-cols-1 items-center sm:grid-cols-2">
          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-neutral-800">
                Display Image
              </span>
              <div className="flex items-center gap-5">
                <Controller
                  control={control}
                  name="image"
                  render={({ field }) => (
                    <FileUpload
                      accept="images"
                      className="mt-2 size-14 shrink-0 rounded-full border border-neutral-300"
                      iconClassName="w-5 h-5"
                      previewClassName="size-14 rounded-full"
                      variant="plain"
                      imageSrc={
                        field.value || `${DICEBEAR_AVATAR_URL}${partner?.name}`
                      }
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
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-neutral-800">
                Full Name
              </span>
              <div>
                <input
                  type="text"
                  className={cn(
                    "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                    errors.name
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  )}
                  placeholder="Acme, Inc."
                  {...register("name", {
                    required: true,
                  })}
                />
              </div>
            </label>
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-neutral-800">
                Country
              </span>
              <div>
                <Controller
                  control={control}
                  name="country"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <CountryCombobox
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={errors.country ? true : false}
                      disabledTooltip={
                        sentPayoutsCount > 0
                          ? "Since you've already received payouts on Dub, you cannot change your country. If you need to update your country, please contact support."
                          : undefined
                      }
                    />
                  )}
                />
              </div>
            </label>
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-neutral-800">
                Description
              </span>
              <div>
                <ReactTextareaAutosize
                  className={cn(
                    "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                    errors.name
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  )}
                  placeholder="Tell us about the kind of content you create – e.g. tech, travel, fashion, etc."
                  minRows={3}
                  maxRows={10}
                  onKeyDown={handleKeyDown}
                  {...register("description")}
                />
              </div>
            </label>
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-neutral-800">
                Profile Type
              </span>
              <div className="w-full">
                <LayoutGroup>
                  <div className="w-full">
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
                        if (sentPayoutsCount === 0) {
                          setValue("profileType", option);
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-0.5 rounded-lg border-neutral-300 bg-neutral-100 p-0.5",
                        sentPayoutsCount > 0 && "cursor-not-allowed",
                      )}
                      optionClassName={cn(
                        "h-9 flex items-center justify-center rounded-lg flex-1",
                        sentPayoutsCount > 0 && "pointer-events-none",
                      )}
                      indicatorClassName="bg-white"
                    />
                  </div>
                </LayoutGroup>
              </div>
            </label>
          </FormRow>

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
                className="contents"
              >
                <FormRow>
                  <label className="contents">
                    <span className="text-sm font-medium text-neutral-800">
                      Legal company name
                    </span>
                    <div>
                      <input
                        type="text"
                        className={cn(
                          "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                          errors.companyName
                            ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                        )}
                        disabled={sentPayoutsCount > 0}
                        {...register("companyName", {
                          required: profileType === "company",
                        })}
                      />
                    </div>
                  </label>
                </FormRow>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-100 px-5 py-3.5">
        <Button
          type="submit"
          text="Save changes"
          className="h-8 w-fit px-2.5"
          loading={isSubmitting || isPending}
        />
      </div>
    </form>
  );
}

function FormRow({ children }: PropsWithChildren) {
  return (
    <div className="contents [&:not(:last-child)>label>*:nth-child(even)]:border-b sm:[&:not(:last-child)>label>*]:border-b [&>label>*:first-child]:pt-5 [&>label>*:last-child]:pb-6 [&>label>*]:flex [&>label>*]:h-full [&>label>*]:items-center [&>label>*]:border-neutral-200 sm:[&>label>*]:py-5">
      {children}
    </div>
  );
}
