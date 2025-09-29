"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { createProgramApplicationAction } from "@/lib/actions/partners/create-program-application";
import useGroup from "@/lib/swr/use-group";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  GroupWithProgramProps,
  ProgramEnrollmentProps,
  ProgramProps,
} from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { createProgramApplicationSchema } from "@/lib/zod/schemas/programs";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  CircleCheckFill,
  Grid,
  Link4,
  Sheet,
} from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { ProgramApplicationFormField } from "./groups/design/fields";

interface ProgramApplicationSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  program?: ProgramProps;
  programEnrollment?: ProgramEnrollmentProps;
  onSuccess?: () => void;
}

type FormData = Omit<
  z.infer<typeof createProgramApplicationSchema>,
  "name" | "email" | "website"
> & {
  termsAgreement: boolean;
};

function ProgramApplicationSheetContent({
  program: programProp,
  programEnrollment,
  onSuccess,
}: ProgramApplicationSheetProps) {
  const { partner } = usePartnerProfile();
  const groupId =
    programEnrollment?.groupId ||
    programProp?.defaultGroupId ||
    DEFAULT_PARTNER_GROUP.slug;
  const { group, loading } = useGroup<GroupWithProgramProps>(
    { groupIdOrSlug: groupId },
    {
      query: { includeExpandedFields: true },
    },
    {
      keepPreviousData: true,
    },
  );

  const program = programProp || group?.program;

  const form = useForm<FormData>({
    defaultValues: {
      termsAgreement: false,
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

  if (!program) return null;

  const fields = group?.applicationFormData?.fields || [];

  return (
    <FormProvider {...form}>
      <div className="relative h-full">
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
          <div className="flex items-start justify-between bg-neutral-50 p-6">
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

          <div className="flex flex-col gap-6 p-5 sm:p-8">
            {fields.map((field, index) => {
              return (
                <ProgramApplicationFormField
                  key={field.id}
                  field={field}
                  keyPath={`formData.fields.${index}`}
                />
              );
            })}

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

          <div className="flex grow flex-col justify-end p-5">
            <Button
              type="submit"
              variant="primary"
              text="Submit application"
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
          {...{
            inert: !isSubmitSuccessful,
          }}
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
              href="/programs"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "mt-8 flex h-10 w-fit cursor-pointer items-center rounded-md border px-4 text-sm",
              )}
            >
              Back to programs
            </Link>
          </div>
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
