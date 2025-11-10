"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { createProgramApplicationAction } from "@/lib/actions/partners/create-program-application";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { ProgramEnrollmentProps, ProgramProps } from "@/lib/types";
import {
  DEFAULT_PARTNER_GROUP,
  PartnerProgramGroupSchema,
} from "@/lib/zod/schemas/groups";
import { createProgramApplicationSchema } from "@/lib/zod/schemas/programs";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  CircleCheck,
  CircleCheckFill,
  Grid,
  Link4,
  LoadingSpinner,
  Sheet,
} from "@dub/ui";
import { cn, fetcher, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { z } from "zod";
import { ProgramApplicationFormField } from "./groups/design/application-form/fields";

interface ProgramApplicationSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  program: Pick<
    ProgramProps,
    "id" | "slug" | "defaultGroupId" | "name" | "domain" | "logo" | "termsUrl"
  >;
  programEnrollment?: ProgramEnrollmentProps;
  backDestination?: "programs" | "marketplace";
  onSuccess?: () => void;
}

type FormData = Omit<
  z.infer<typeof createProgramApplicationSchema>,
  "name" | "email" | "website"
> & {
  termsAgreement: boolean;
};

function ProgramApplicationSheetContent({
  program,
  programEnrollment,
  backDestination = "programs",
  onSuccess,
}: ProgramApplicationSheetProps) {
  const { partner } = usePartnerProfile();
  const groupIdOrSlug =
    programEnrollment?.groupId ||
    program?.defaultGroupId ||
    DEFAULT_PARTNER_GROUP.slug;

  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
  } = useSWR<z.infer<typeof PartnerProgramGroupSchema>>(
    groupIdOrSlug
      ? `/api/partner-profile/programs/${program.id}/groups/${groupIdOrSlug}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const form = useForm<FormData>({
    defaultValues: {
      termsAgreement: false,
      formData: { fields: group?.applicationFormData?.fields ?? [] },
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;

  const { executeAsync } = useAction(createProgramApplicationAction, {
    onSuccess: () => {
      mutate(`/api/partner-profile/programs/${program!.slug}`);
      onSuccess?.();
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!group || !program || !partner?.email || !partner.country) return;

    const result = await executeAsync({
      ...data,
      email: partner.email,
      name: partner.name,
      country: partner.country,
      programId: program.id,
      groupId: group.id,
    });

    if (result?.serverError || result?.validationErrors) {
      setError("root.serverError", {
        message: "Failed to submit application",
      });
      toast.error(parseActionError(result, "Failed to submit application"));
    }
  };

  const fields = group?.applicationFormData?.fields || [];

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn(
          "flex h-full flex-col transition-opacity duration-200",
          isSubmitSuccessful && "pointer-events-none opacity-0",
        )}
        {...{
          inert: isSubmitSuccessful,
        }}
      >
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-start justify-between p-6">
            <Sheet.Title asChild className="min-w-0">
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                    alt={program.name}
                    className="size-10 rounded-full border border-black/10"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-base font-semibold leading-tight text-neutral-900">
                      {program.name}
                    </span>

                    <div className="flex items-center gap-1 text-neutral-500">
                      <Link4 className="size-3 shrink-0" />
                      <span className="min-w-0 truncate text-sm font-medium">
                        {program.domain}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isGroupLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-5 sm:p-8">
              {fields?.length ? (
                fields.map((field, index) => {
                  return (
                    <ProgramApplicationFormField
                      key={field.id}
                      field={field}
                      keyPath={`formData.fields.${index}`}
                    />
                  );
                })
              ) : (
                <p className="text-content-subtle flex items-center gap-1 text-sm">
                  <CircleCheck className="inline-block size-4 text-green-500" />
                  No additional information required to apply
                </p>
              )}

              {program.termsUrl && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="termsAgreement"
                    className={cn(
                      "h-4 w-4 rounded border-neutral-300 text-[var(--brand)] focus:ring-[var(--brand)]",
                      errors.termsAgreement &&
                        "border-red-400 focus:ring-red-500",
                    )}
                    {...register("termsAgreement", {
                      required: true,
                      validate: (v) => v === true,
                    })}
                  />
                  <label
                    htmlFor="termsAgreement"
                    className="text-sm text-neutral-800"
                  >
                    I agree to the{" "}
                    <a
                      href={program.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand)] underline hover:opacity-80"
                    >
                      {program.name} Affiliate Program Terms ↗
                    </a>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white p-5">
          <Button
            type="submit"
            variant="primary"
            text="Submit application"
            disabled={isGroupLoading || groupError}
            loading={isSubmitting}
          />
        </div>
      </form>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[transform,opacity]",
          isSubmitSuccessful
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
        inert={!isSubmitSuccessful}
      >
        <Grid
          cellSize={60}
          className="[mask-image:linear-gradient(black,transparent)]"
        />
        <div className="relative flex flex-col items-center">
          <div className="relative z-0 flex items-center">
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="z-10 size-20 rotate-[-15deg] rounded-full drop-shadow-md"
            />
            <img
              src={partner?.image || `${OG_AVATAR_URL}${partner?.name}`}
              alt={partner?.name || "Your avatar"}
              className="-ml-4 size-20 rotate-[15deg] rounded-full drop-shadow-md"
            />
            <div className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white p-0.5">
              <CircleCheckFill className="size-8 text-green-500" />
            </div>
          </div>
          <span className="mt-6 block text-base font-semibold text-neutral-900">
            Application submitted
          </span>
          <p className="mt-2 max-w-[300px] text-pretty text-center text-sm text-neutral-500">
            You're all set! Your application is pending review and we'll email
            you once approved.
          </p>
          <Link
            href={
              backDestination === "marketplace"
                ? "/programs/marketplace"
                : "/programs"
            }
            className={cn(
              buttonVariants({ variant: "primary" }),
              "mt-8 flex h-9 w-fit cursor-pointer items-center rounded-lg border px-4 text-sm",
            )}
          >
            Back to {backDestination}
          </Link>
        </div>
      </div>
    </FormProvider>
  );
}

export function ProgramApplicationSheet({
  isOpen,
  nested,
  ...rest
}: ProgramApplicationSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <ProgramApplicationSheetContent {...rest} />
    </Sheet>
  );
}

export function useProgramApplicationSheet(
  props: Omit<ProgramApplicationSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    programApplicationSheet: (
      <ProgramApplicationSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
