"use client";

import {
  createProgramApplicationAction,
  PartnerData,
} from "@/lib/actions/partners/create-program-application";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  GroupWithFormDataProps,
  ProgramApplicationFormDataWithValues,
  ProgramProps,
} from "@/lib/types";
import { useTrackApplyStart } from "@/ui/application-analytics";
import { Button, useLocalStorage, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ProgramApplicationFormField } from "./fields";
import { FormControlRequiredBadge } from "./fields/form-control";
import { formDataForApplicationFormData } from "./form-data-for-application-form-data";

type FormData = {
  name: string;
  email: string;
  termsAgreement: boolean;
  formData: ProgramApplicationFormDataWithValues;
};

export function ProgramApplicationForm({
  program,
  group,
  preview = false,
}: {
  program: Pick<ProgramProps, "id" | "slug" | "name" | "termsUrl">;
  group: Pick<GroupWithFormDataProps, "id" | "applicationFormData" | "slug">;
  preview?: boolean;
}) {
  const { isMobile } = useMediaQuery();
  const router = useRouter();
  const { data: session } = useSession();
  const trackApplyStart = useTrackApplyStart({
    preview,
  });

  const { programEnrollment } = useProgramEnrollment({
    enabled: !preview,
    programSlug: program.slug,
    swrOpts: {
      shouldRetryOnError: false,
    },
  });

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      termsAgreement: false,
      formData: formDataForApplicationFormData(
        group.applicationFormData?.fields ?? [],
      ),
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;

  const [fieldStatuses, setFieldStatuses] = useState<Record<string, boolean>>(
    {},
  );

  const handleFieldStatusChange = useCallback(
    (fieldId: string, isLoading: boolean) => {
      setFieldStatuses((prev) => ({
        ...prev,
        [fieldId]: isLoading,
      }));
    },
    [],
  );

  const hasAnyLoadingStatus = Object.values(fieldStatuses).some(
    (loading) => loading,
  );

  useEffect(() => {
    if (preview || !session?.user) return;

    setValue("name", session.user.name ?? "");
    setValue("email", session.user.email ?? "");
  }, [preview, session?.user, setValue]);

  const [_, setSubmissionInfo] = useLocalStorage<PartnerData | null>(
    `application-form-partner-data`,
    null,
  );

  const { executeAsync, isPending } = useAction(
    createProgramApplicationAction,
    {
      async onSuccess({ data }) {
        if (!data) {
          toast.error("Failed to submit application. Please try again.");
          return;
        }

        const { programApplicationId, programEnrollmentId, partnerData } = data;

        setSubmissionInfo({
          name: partnerData.name,
          country: partnerData.country,
        });

        const searchParams = new URLSearchParams({
          applicationId: programApplicationId,
          ...(programEnrollmentId && {
            enrollmentId: programEnrollmentId,
          }),
        });

        router.push(
          `/${program.slug}/${group.slug}/apply/success?${searchParams.toString()}`,
        );
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const isLoading =
    isSubmitting || isSubmitSuccessful || isPending || hasAnyLoadingStatus;

  if (
    programEnrollment?.status === "approved" &&
    programEnrollment.groupId === group.id
  ) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
        <p className="text-content-default text-sm">
          You&apos;re already in this group.
        </p>
        <Link
          href={`/programs/${program.slug}`}
          className="text-sm font-medium text-[var(--brand)] underline underline-offset-2 hover:opacity-80"
        >
          Go to program dashboard
        </Link>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form
        onInputCapture={trackApplyStart}
        onSubmit={handleSubmit(async (data) => {
          const result = await executeAsync({
            ...data,
            programId: program.id,
            groupId: group.id,
          });

          if (!result || result.serverError || result.validationErrors) {
            setError("root.serverError", {
              message: "Error submitting application.",
            });
          }
        })}
        className="flex flex-col gap-6"
      >
        <label>
          <div className="flex items-center gap-1.5">
            <span className="text-content-emphasis text-sm font-medium">
              Name
            </span>
            <FormControlRequiredBadge />
          </div>
          <input
            type="text"
            autoComplete="name"
            className={cn(
              "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
              errors.name
                ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
            )}
            placeholder=""
            autoFocus={!isMobile}
            {...register("name", {
              required: true,
            })}
          />
        </label>

        <label>
          <div className="flex items-center gap-1.5">
            <span className="text-content-emphasis text-sm font-medium">
              Email
            </span>
            <FormControlRequiredBadge />
          </div>
          <input
            type="email"
            autoComplete="email"
            className={cn(
              "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
              errors.email
                ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
            )}
            placeholder=""
            {...register("email", {
              required: true,
            })}
          />
        </label>

        {group?.applicationFormData?.fields.map((field, index) => {
          return (
            <ProgramApplicationFormField
              key={field.id}
              field={field}
              keyPath={`formData.fields.${index}`}
              onStatusChange={(loading) =>
                handleFieldStatusChange(field.id, loading)
              }
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
                errors.termsAgreement && "border-red-400 focus:ring-red-500",
              )}
              {...register("termsAgreement", { required: true })}
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
                {program.name} Program Terms ↗
              </a>
            </label>
          </div>
        )}

        <Button
          text="Continue"
          className="mt-4 enabled:border-[var(--brand)] enabled:bg-[var(--brand)] enabled:hover:bg-[var(--brand)] enabled:hover:ring-[var(--brand-ring)]"
          loading={isLoading}
        />
      </form>
    </FormProvider>
  );
}
