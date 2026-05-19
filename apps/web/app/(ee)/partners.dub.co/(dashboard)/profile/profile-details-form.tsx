import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import { PartnerProps } from "@/lib/types";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import {
  PartnerPlatformsForm,
  usePartnerPlatformsForm,
} from "@/ui/partners/partner-platforms-form";
import { CustomToast } from "@/ui/shared/custom-toast";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PartnerProfileType } from "@dub/prisma/client";
import {
  Button,
  DynamicTooltipWrapper,
  FileUpload,
  ToggleGroup,
  TooltipContent,
  buttonVariants,
} from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, RefObject, SetStateAction, useEffect, useRef } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import { IdentityVerificationSection } from "./identity-verification-section";
import { SettingsRow } from "./settings-row";

type BasicInfoFormData = {
  name: string;
  email: string;
  username: string;
  image: string | null;
  country: string;
  profileType: PartnerProfileType;
  companyName: string | null;
};

export function ProfileDetailsForm({
  partner,
  setShowMergePartnerAccountsModal,
}: {
  partner?: PartnerProps;
  setShowMergePartnerAccountsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const disabled = partner
    ? !hasPermission(partner.role, "partner_profile.update")
    : true;
  const basicInfoFormRef = useRef<HTMLFormElement>(null);
  const partnerPlatformsFormRef = useRef<HTMLFormElement>(null);

  const basicInfoForm = useForm<BasicInfoFormData>({
    defaultValues: {
      name: partner?.name,
      email: partner?.email ?? "",
      username: partner?.username ?? "",
      image: partner?.image,
      country: partner?.country ?? "",
      profileType: partner?.profileType ?? "individual",
      companyName: partner?.companyName ?? null,
    },
  });
  const partnerPlatformsForm = usePartnerPlatformsForm({ partner });

  const { payoutsCount } = usePartnerPayoutsCount({
    status: "completed",
  });

  return (
    <div className="border-border-subtle divide-border-subtle flex flex-col divide-y rounded-lg border">
      <div className="px-6 py-8">
        <h3 className="text-content-emphasis text-lg font-semibold leading-7">
          Profile details
        </h3>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Basic details that make up your profile.
        </p>
      </div>

      <SettingsRow
        id="info"
        heading="Basic information"
        description="Your core details, and information that's required to set up your Dub Partner account."
      >
        <FormProvider {...basicInfoForm}>
          <BasicInfoForm
            partner={partner}
            formRef={basicInfoFormRef}
            disabled={disabled}
            onSubmitAction={() => basicInfoFormRef.current?.requestSubmit()}
          />
        </FormProvider>
      </SettingsRow>

      <div className="flex items-center justify-end bg-neutral-50 px-6 py-4">
        <Button
          text="Save changes"
          className="h-8 w-fit px-2.5"
          disabled={disabled}
          loading={basicInfoForm.formState.isSubmitting}
          onClick={() => basicInfoFormRef.current?.requestSubmit()}
        />
      </div>

      {["approved", "trusted"].includes(partner?.networkStatus ?? "") && (
        <SettingsRow
          id="identity-verification"
          heading="Identity verification"
          description="Verify your identity to build trust with programs and get approved for programs faster."
        >
          <IdentityVerificationSection
            partner={partner}
            setShowMergePartnerAccountsModal={setShowMergePartnerAccountsModal}
          />
        </SettingsRow>
      )}

      <SettingsRow
        id="platforms"
        heading="Website and socials"
        description="Add your website and social accounts you use to share links. Verifying as many platforms as possible helps build trust with programs."
      >
        <PartnerPlatformsForm
          ref={partnerPlatformsFormRef}
          partner={partner}
          form={partnerPlatformsForm}
          variant="settings"
        />
      </SettingsRow>

      <div className="flex items-center justify-end rounded-b-lg bg-neutral-50 px-6 py-4">
        <Button
          text="Save changes"
          className="h-8 w-fit px-2.5"
          disabled={disabled}
          loading={partnerPlatformsForm.formState.isSubmitting}
          onClick={() => {
            if (disabled) return;
            partnerPlatformsFormRef.current?.requestSubmit();
          }}
        />
      </div>
    </div>
  );
}

function BasicInfoForm({
  partner,
  formRef,
  disabled,
  onSubmitAction,
}: {
  partner?: PartnerProps;
  formRef: RefObject<HTMLFormElement | null>;
  disabled: boolean;
  onSubmitAction: () => void;
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

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onSuccess: async ({ data }) => {
      if (data?.needsEmailVerification) {
        toast.success(
          "Please check your email to verify your new email address.",
        );
      } else {
        toast.success("Your profile has been updated.");
      }
      mutatePrefix("/api/partner-profile");
    },
    onError({ error }) {
      if (error.validationErrors) {
        toast.error(parseActionError(error, "Could not update your profile."));
        return;
      }

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
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;

        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT") return;

        e.preventDefault();
        onSubmitAction();
      }}
      onSubmit={handleSubmit(async (data) => {
        const imageChanged = data.image !== partner?.image;

        await executeAsync({
          ...data,
          username: data.username || undefined,
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
                  disabled={disabled}
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
              disabled={disabled}
              className={cn(
                "block w-full rounded-md focus:outline-none sm:text-sm",
                disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
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
            disabled={disabled}
            className={cn(
              "block w-full rounded-md focus:outline-none sm:text-sm",
              disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-800">Username</span>
          <div className="relative w-full">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-400">
              @
            </span>
            <input
              type="text"
              disabled={disabled}
              className={cn(
                "block w-full rounded-md pl-7 focus:outline-none sm:text-sm",
                disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
                errors.username
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
              )}
              placeholder={partner?.email?.split("@")[0] ?? ""}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              minLength={3}
              maxLength={30}
              {...register("username")}
            />
          </div>
          <p className="text-xs text-neutral-500">
            3–30 characters. Lowercase letters, numbers, hyphens, and
            underscores only.
          </p>
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
                disabledTooltip={
                  <TooltipContent
                    title="Your profile country is based on your current location and cannot be changed. If you need to update your country, please contact support."
                    cta="Contact support"
                    href="https://dub.co/support"
                    target="_blank"
                  />
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
            tooltipProps={{
              content: disabled
                ? "You don't have permission to update this field"
                : undefined,
            }}
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
                    if (!disabled) {
                      setValue("profileType", option);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-0.5 rounded-lg border-neutral-300 bg-neutral-100 p-0.5",
                    disabled && "cursor-not-allowed",
                  )}
                  optionClassName={cn(
                    "h-9 flex items-center justify-center rounded-lg flex-1",
                    disabled && "pointer-events-none text-neutral-400",
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
                    disabled={disabled}
                    className={cn(
                      "block w-full rounded-md focus:outline-none sm:text-sm",
                      disabled &&
                        "cursor-not-allowed bg-neutral-50 text-neutral-400",
                      errors.companyName
                        ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                    )}
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
