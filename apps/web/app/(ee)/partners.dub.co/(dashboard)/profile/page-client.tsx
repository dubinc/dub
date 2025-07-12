"use client";

import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps, PayoutsCount } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { useMergePartnerAccountsModal } from "@/ui/partners/merge-accounts/merge-partner-accounts-modal";
import { CustomToast } from "@/ui/shared/custom-toast";
import { AlertCircleFill } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  DotsPattern,
  DynamicTooltipWrapper,
  FileUpload,
  LoadingSpinner,
  ToggleGroup,
  useEnterSubmit,
} from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { PartnerProfileType } from "@prisma/client";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { PropsWithChildren, RefObject, useRef } from "react";
import {
  Controller,
  FormProvider as FormContextProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

export function ProfileSettingsPageClient() {
  const { partner, error } = usePartnerProfile();

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <FormWrapper partner={partner}>
      <PageContent
        title="Profile info"
        titleInfo={{
          title:
            "Build a stronger partner profile and increase trust by adding and verifying your website and social accounts.",
          href: "https://dub.co/help/article/partner-profile",
        }}
        controls={<Controls formRef={formRef} />}
      >
        <PageWidthWrapper className="mb-20 flex flex-col gap-8">
          <div className="relative m-1 mb-8">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl bg-neutral-100/50 [mask-image:linear-gradient(black,transparent_60%)]"
              aria-hidden
            >
              <div className="absolute inset-4 overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2">
                  <DotsPattern className="text-neutral-200/80" />
                </div>
              </div>
            </div>
            <div className="relative mx-auto my-12 w-full max-w-[400px]">
              {partner ? (
                <ProfileForm partner={partner} formRef={formRef} />
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
          </div>
        </PageWidthWrapper>
      </PageContent>
    </FormWrapper>
  );
}

function FormWrapper({
  partner,
  children,
}: PropsWithChildren<{ partner?: PartnerProps }>) {
  return partner ? (
    <FormProvider partner={partner}>{children}</FormProvider>
  ) : (
    children
  );
}

type ProfileFormData = {
  name: string;
  email: string;
  image: string | null;
  description: string | null;
  country: string;
  profileType: PartnerProfileType;
  companyName: string | null;
};

function FormProvider({
  partner,
  children,
}: PropsWithChildren<{ partner: PartnerProps }>) {
  const form = useForm<ProfileFormData>({
    defaultValues: {
      name: partner.name,
      email: partner.email ?? "",
      image: partner.image,
      description: partner.description ?? null,
      country: partner.country ?? "",
      profileType: partner.profileType ?? "individual",
      companyName: partner.companyName ?? null,
    },
  });

  return <FormContextProvider {...form}>{children}</FormContextProvider>;
}

function Controls({ formRef }: { formRef: RefObject<HTMLFormElement> }) {
  const { partner } = usePartnerProfile();

  const { MergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    useMergePartnerAccountsModal();

  const {
    formState: { isSubmitting },
  } = useFormContext();

  const {
    setShowConfirmModal: setShowStripeConfirmModal,
    confirmModal: stripeConfirmModal,
  } = useConfirmModal({
    title: "Confirm profile update",
    description:
      "Updating your email, country, or profile type will reset your Stripe account, which will require you to restart the payout connection process. Are you sure you want to continue?",
    confirmText: "Continue",
    onConfirm: () => {
      formRef.current?.requestSubmit();
    },
  });

  return (
    <>
      <MergePartnerAccountsModal />
      {stripeConfirmModal}
      <Button
        text="Merge accounts"
        variant="secondary"
        className="h-8 w-fit px-2.5"
        onClick={() => setShowMergePartnerAccountsModal(true)}
      />
      <Button
        text="Save changes"
        className="h-8 w-fit px-2.5"
        loading={isSubmitting}
        onClick={() => {
          if (partner?.stripeConnectId) {
            setShowStripeConfirmModal(true);
          } else {
            formRef.current?.requestSubmit();
          }
        }}
      />
    </>
  );
}

function ProfileForm({
  partner,
  formRef,
}: {
  partner: PartnerProps;
  formRef: RefObject<HTMLFormElement>;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  const { profileType } = watch();

  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const completedPayoutsCount =
    payoutsCount?.find((payout) => payout.status === "completed")?.count ?? 0;

  const { handleKeyDown } = useEnterSubmit();

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onSuccess: async () => {
      toast.success("Profile updated successfully.");
    },
    onError({ error }) {
      setError("root.serverError", {
        message: error.serverError,
      });

      if (error.serverError?.includes("merge your partner accounts")) {
        toast.custom(() => (
          <CustomToast icon={AlertCircleFill}>
            Email already in use. Do you want to [merge your partner
            accounts](https://d.to/merge-partners) instead?
          </CustomToast>
        ));
      } else {
        toast.error(error.serverError);
      }
    },
  });

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(async (data) => {
        const imageChanged = data.image !== partner.image;

        await executeAsync({
          ...data,
          image: imageChanged ? data.image : null,
        });
      })}
    >
      <div className="px-5">
        <div className="flex flex-col gap-6">
          <label>
            <div className="flex items-center gap-5">
              <Controller
                control={control}
                name="image"
                render={({ field }) => (
                  <FileUpload
                    accept="images"
                    className="size-20 shrink-0 rounded-full border border-neutral-300 sm:size-32"
                    iconClassName="w-5 h-5"
                    previewClassName="size-20 sm:size-32 rounded-full"
                    variant="plain"
                    imageSrc={field.value || `${OG_AVATAR_URL}${partner?.name}`}
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
                    "flex h-8 w-fit cursor-pointer items-center rounded-md border px-2.5 text-xs",
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
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Full name
            </span>
            <div>
              <input
                type="text"
                className={cn(
                  "block w-full rounded-md focus:outline-none sm:text-sm",
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
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Email</span>
            <DynamicTooltipWrapper
              tooltipProps={
                completedPayoutsCount > 0
                  ? {
                      content:
                        "Since you've already received payouts on Dub, you cannot change your email. If you need to update your email, please contact support.",
                    }
                  : undefined
              }
            >
              <input
                type="email"
                className={cn(
                  "block w-full rounded-md focus:outline-none sm:text-sm",
                  errors.email
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  completedPayoutsCount > 0 &&
                    "cursor-not-allowed bg-neutral-100 text-neutral-400",
                )}
                placeholder="panic@thedis.co"
                disabled={completedPayoutsCount > 0}
                {...register("email", {
                  required: true,
                })}
              />
            </DynamicTooltipWrapper>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">
              Country
            </span>
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
                    completedPayoutsCount > 0
                      ? "Since you've already received payouts on Dub, you cannot change your country. If you need to update your country, please contact support."
                      : undefined
                  }
                />
              )}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">
              About yourself
            </span>
            <div>
              <ReactTextareaAutosize
                className={cn(
                  "block w-full rounded-md focus:outline-none sm:text-sm",
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

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Profile type
            </span>
            <DynamicTooltipWrapper
              tooltipProps={
                completedPayoutsCount > 0
                  ? {
                      content:
                        "Since you've already received payouts on Dub, you cannot change your profile type. If you need to update your profile type, please contact support.",
                    }
                  : undefined
              }
            >
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
                      if (completedPayoutsCount === 0) {
                        setValue("profileType", option);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-0.5 rounded-lg border-neutral-300 bg-neutral-100 p-0.5",
                      completedPayoutsCount > 0 && "cursor-not-allowed",
                    )}
                    optionClassName={cn(
                      "h-9 flex items-center justify-center rounded-lg flex-1",
                      completedPayoutsCount > 0 &&
                        "pointer-events-none text-neutral-400",
                    )}
                    indicatorClassName="bg-white"
                  />
                </div>
              </LayoutGroup>
            </DynamicTooltipWrapper>
          </label>

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
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-neutral-800">
                    Legal company name
                  </span>
                  <div>
                    <input
                      type="text"
                      className={cn(
                        "block w-full rounded-md focus:outline-none sm:text-sm",
                        errors.companyName
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      disabled={completedPayoutsCount > 0}
                      {...register("companyName", {
                        required: profileType === "company",
                      })}
                    />
                  </div>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
