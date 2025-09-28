import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import { PartnerProps, PayoutsCount } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import {
  OnlinePresenceForm,
  useOnlinePresenceForm,
} from "@/ui/partners/online-presence-form";
import { CustomToast } from "@/ui/shared/custom-toast";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PartnerProfileType } from "@dub/prisma/client";
import {
  Button,
  DynamicTooltipWrapper,
  FileUpload,
  ToggleGroup,
  buttonVariants,
} from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { RefObject, useEffect, useRef } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import { SettingsRow } from "./settings-row";

type BasicInfoFormData = {
  name: string;
  email: string;
  image: string | null;
  country: string;
  profileType: PartnerProfileType;
  companyName: string | null;
};

export function ProfileDetailsForm({ partner }: { partner?: PartnerProps }) {
  const basicInfoFormRef = useRef<HTMLFormElement>(null);
  const onlinePresenceFormRef = useRef<HTMLFormElement>(null);

  const basicInfoForm = useForm<BasicInfoFormData>({
    defaultValues: {
      name: partner?.name,
      email: partner?.email ?? "",
      image: partner?.image,
      country: partner?.country ?? "",
      profileType: partner?.profileType ?? "individual",
      companyName: partner?.companyName ?? null,
    },
  });
  const onlinePresenceForm = useOnlinePresenceForm({ partner });

  const {
    setShowConfirmModal: setShowStripeConfirmModal,
    confirmModal: stripeConfirmModal,
  } = useConfirmModal({
    title: "Confirm profile update",
    description:
      "Updating your country or profile type will reset your Stripe account, which will require you to restart the payout connection process. Are you sure you want to continue?",
    confirmText: "Continue",
    onConfirm: () => {
      basicInfoFormRef.current?.requestSubmit();
      onlinePresenceFormRef.current?.requestSubmit();
    },
  });

  return (
    <div className="border-border-subtle divide-border-subtle flex flex-col divide-y rounded-lg border">
      {stripeConfirmModal}
      <div className="px-6 py-8">
        <h3 className="text-content-emphasis text-lg font-semibold leading-7">
          Profile details
        </h3>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Basic details that make up your profile.
        </p>
      </div>

      <SettingsRow
        heading="Basic information"
        description="Your core details, and information that's required to set up your Dub Partner account."
      >
        <FormProvider {...basicInfoForm}>
          <BasicInfoForm partner={partner} formRef={basicInfoFormRef} />
        </FormProvider>
      </SettingsRow>

      <SettingsRow
        heading="Website and socials"
        description="Add your website and social accounts you use to share links. Verifying at least one helps build trust with programs."
      >
        <OnlinePresenceForm
          ref={onlinePresenceFormRef}
          partner={partner}
          form={onlinePresenceForm}
          variant="settings"
        />
      </SettingsRow>

      <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-4">
        <Button
          text="Save changes"
          className="h-8 w-fit px-2.5"
          loading={
            basicInfoForm.formState.isSubmitting ||
            onlinePresenceForm.formState.isSubmitting
          }
          onClick={() => {
            if (
              partner?.stripeConnectId &&
              (basicInfoForm.formState.dirtyFields.country ||
                basicInfoForm.formState.dirtyFields.profileType ||
                basicInfoForm.formState.dirtyFields.companyName)
            ) {
              setShowStripeConfirmModal(true);
            } else {
              basicInfoFormRef.current?.requestSubmit();
              onlinePresenceFormRef.current?.requestSubmit();
            }
          }}
        />
      </div>
    </div>
  );
}

function BasicInfoForm({
  partner,
  formRef,
}: {
  partner?: PartnerProps;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useFormContext<BasicInfoFormData>();

  // Reset form dirty state after submit
  useEffect(() => {
    if (isSubmitSuccessful)
      reset(getValues(), { keepValues: true, keepDirty: false });
  }, [isSubmitSuccessful, reset, getValues]);

  const { profileType } = watch();

  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const completedPayoutsCount =
    payoutsCount
      ?.filter((payout) => ["sent", "completed"].includes(payout.status))
      .reduce((acc, payout) => acc + payout.count, 0) ?? 0;

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onSuccess: async ({ data }) => {
      if (data?.needsEmailVerification) {
        toast.success(
          "Please check your email to verify your new email address.",
        );
      } else {
        toast.success("Your profile has been updated.");
      }
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
        const imageChanged = data.image !== partner?.image;

        await executeAsync({
          ...data,
          image: imageChanged ? data.image : null,
        });
      })}
    >
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
              placeholder="Brendon Urie"
              {...register("name", {
                required: true,
              })}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-800">Email</span>
          <input
            type="email"
            className={cn(
              "block w-full rounded-md focus:outline-none sm:text-sm",
              errors.email
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
            )}
            placeholder="panic@thedis.co"
            {...register("email", {
              required: true,
            })}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-800">Country</span>
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
    </form>
  );
}
