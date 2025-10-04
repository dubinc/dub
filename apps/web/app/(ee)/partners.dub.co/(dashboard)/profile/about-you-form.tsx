import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import {
  industryInterests,
  monthlyTrafficAmounts,
} from "@/lib/partners/partner-profile";
import { mutatePrefix } from "@/lib/swr/mutate";
import { PartnerProps } from "@/lib/types";
import { MAX_PARTNER_DESCRIPTION_LENGTH } from "@/lib/zod/schemas/partners";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { IndustryInterest, MonthlyTraffic } from "@dub/prisma/client";
import { Button, RadioGroup, RadioGroupItem, useEnterSubmit } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { IndustryInterestsModal } from "./industry-interests-modal";
import { SettingsRow } from "./settings-row";

type AboutYouFormData = {
  description: string;
  industryInterests: IndustryInterest[];
  monthlyTraffic: MonthlyTraffic;
};

export function AboutYouForm({ partner }: { partner?: PartnerProps }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<AboutYouFormData>({
    defaultValues: {
      description: partner?.description ?? undefined,
      industryInterests: partner?.industryInterests ?? [],
      monthlyTraffic: partner?.monthlyTraffic ?? undefined,
    },
  });

  // Reset form dirty state after submit
  useEffect(() => {
    if (isSubmitSuccessful)
      reset(getValues(), { keepValues: true, keepDirty: false });
  }, [isSubmitSuccessful, reset, getValues]);

  const { handleKeyDown } = useEnterSubmit();

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onSuccess: () => {
      toast.success("Your profile has been updated.");
      mutatePrefix("/api/partner-profile");
    },
    onError({ error }) {
      setError("root.serverError", {
        message: error.serverError,
      });

      toast.error(error.serverError);
    },
  });

  const [showIndustryInterestsModal, setShowIndustryInterestsModal] =
    useState(false);

  return (
    <div className="border-border-subtle divide-border-subtle flex flex-col divide-y rounded-lg border">
      <div className="px-6 py-8">
        <h3 className="text-content-emphasis text-lg font-semibold leading-7">
          About you and your expertise
        </h3>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Help programs get to know you, your background, interests, and what
          makes you a great partner.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(async (data) => {
          await executeAsync(data);
        })}
      >
        <SettingsRow
          id="about"
          heading="About you"
          description="Share who you are, what you do, and who your audience is. A strong bio helps you stand out and get accepted into more programs."
        >
          <div>
            <ReactTextareaAutosize
              className={cn(
                "block w-full rounded-md focus:outline-none sm:text-sm",
                errors.description
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
              )}
              placeholder="Tell us about the kind of content you create – e.g. tech, travel, fashion, etc."
              minRows={3}
              maxRows={10}
              maxLength={MAX_PARTNER_DESCRIPTION_LENGTH}
              onKeyDown={handleKeyDown}
              {...register("description")}
            />
            <MaxCharactersCounter
              name="description"
              maxLength={MAX_PARTNER_DESCRIPTION_LENGTH}
              control={control}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          id="interests"
          heading="Industry interests"
          description="Add the industries you care and post content about. This helps programs in those areas discover you."
        >
          <Controller
            control={control}
            name="industryInterests"
            render={({ field }) => (
              <>
                <IndustryInterestsModal
                  show={showIndustryInterestsModal}
                  setShow={setShowIndustryInterestsModal}
                  interests={field.value}
                  onSave={(interests) => field.onChange(interests)}
                />
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {field.value.length > 0
                    ? industryInterests
                        .filter(({ id }) => field.value.includes(id))
                        .map((interest) => (
                          <div
                            key={interest.id}
                            className={cn(
                              "ring-border-subtle flex select-none items-center gap-2.5 rounded-full bg-white px-4 py-3 ring-1",
                            )}
                          >
                            <interest.icon className="size-4 text-neutral-600" />
                            <span className="text-content-emphasis text-sm font-medium">
                              {interest.label}
                            </span>
                          </div>
                        ))
                    : [...Array(3)].map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "border-border-subtle h-11 w-32 rounded-full border border-dashed bg-white",
                          )}
                        />
                      ))}
                </div>
                <Button
                  text={`${field.value.length ? "Edit" : "Add"} interests`}
                  onClick={() => setShowIndustryInterestsModal(true)}
                  variant="secondary"
                  className="h-8 w-fit rounded-lg px-3"
                />
              </>
            )}
          />
        </SettingsRow>

        <SettingsRow
          heading="Estimated monthly traffic"
          description="Including websites, newsletters, and social accounts."
        >
          <Controller
            control={control}
            name="monthlyTraffic"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                className="flex flex-col gap-4"
              >
                {monthlyTrafficAmounts.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2.5">
                    <RadioGroupItem
                      value={id}
                      className="text-content-emphasis border-border-default"
                    />
                    <span className="text-content-emphasis text-sm font-medium">
                      {label}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </SettingsRow>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <Button
            text="Save changes"
            className="h-8 w-fit px-2.5"
            loading={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
