"use client";

import { createProgramApplicationAction, PartnerData } from "@/lib/actions/partners/create-program-application";
import { GroupWithFormDataProps, ProgramProps } from "@/lib/types";
import { Button, useLocalStorage, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { programApplicationFormDataWithValuesSchema, programApplicationFormFieldSchema, programApplicationFormLongTextFieldWithValueSchema, programApplicationFormMultipleChoiceFieldSchema, programApplicationFormMultipleChoiceFieldWithValueSchema, programApplicationFormSelectFieldWithValueSchema, programApplicationFormShortTextFieldWithValueSchema, programApplicationFormWebsiteAndSocialsFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";
import z from "@/lib/zod";
import { CountryCombobox } from "../../country-combobox";
import { ProgramApplicationFormField } from "./fields";

type Data = z.infer<typeof programApplicationFormDataWithValuesSchema>

type FormData = {
  name: string;
  email: string;
  country: string;
  ageVerification: boolean;
  termsAgreement: boolean;
  formData: Data
}

const formDataForApplicationFormData = (fields: z.infer<typeof programApplicationFormFieldSchema>[]): Data => {
  return {
    fields: fields.map((field: any) => {
      switch (field.type) {
        case "short-text":
          return {
            ...field,
            value: "",
          } as z.infer<typeof programApplicationFormShortTextFieldWithValueSchema>;
        case "long-text":
          return {
            ...field,
            value: "",
          } as z.infer<typeof programApplicationFormLongTextFieldWithValueSchema>;
        case "select":
          return {
            ...field,
            value: "",
          } as z.infer<typeof programApplicationFormSelectFieldWithValueSchema>;
        case "multiple-choice":
          const multipleChoiceField = field as z.infer<typeof programApplicationFormMultipleChoiceFieldSchema>;
          return {
            ...field,
            value: multipleChoiceField.data.multiple ? [] : "",
          } as z.infer<typeof programApplicationFormMultipleChoiceFieldWithValueSchema>;
        case "website-and-socials":
          return {
            ...field,
            data: field.data.map((data) => ({
              ...data,
              value: "",
            })),
          } as z.infer<typeof programApplicationFormWebsiteAndSocialsFieldWithValueSchema>;
      }
    })
  } as any;
}

export function ProgramApplicationForm({
  program,
  group,
  preview = false,
}: {
  program: Pick<
    ProgramProps,
    "id" | "slug" | "name" | "termsUrl" | "ageVerification"
  >;
  group: Pick<GroupWithFormDataProps, "id" | "applicationFormData" | "slug">;
  preview?: boolean;
}) {
  const { isMobile } = useMediaQuery();
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      country: "",
      ageVerification: false,
      termsAgreement: false,
      formData: formDataForApplicationFormData(group.applicationFormData?.fields ?? []),
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form

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

        toast.success("Your application submitted successfully.");

        const { programApplicationId, programEnrollmentId, partnerData } = data;

        setSubmissionInfo({ name: partnerData.name, country: partnerData.country });

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

  const isLoading = isSubmitting || isSubmitSuccessful || isPending;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(async (data) => {
          const result = await executeAsync({
            ...data,
            programId: program.id,
            groupId: group.id
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
          <span className="text-sm font-medium text-neutral-800">Name</span>
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
          <span className="text-sm font-medium text-neutral-800">Email</span>
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
                className="focus:border-[var(--brand)] focus:ring-[var(--brand)]"
              />
            )}
          />
        </label>

        {group?.applicationFormData?.fields.map((field, index) => {
          return <ProgramApplicationFormField key={field.id} field={field} keyPath={`formData.fields.${index}`} />;
        })}

        {program.ageVerification && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ageVerification"
              className={cn(
                "h-4 w-4 rounded border-neutral-300 text-[var(--brand)] focus:ring-[var(--brand)]",
                errors.ageVerification && "border-red-400 focus:ring-red-500",
              )}
              {...register("ageVerification", {
                required: true,
              })}
            />
            <label htmlFor="ageVerification" className="text-sm text-neutral-800">
              I'm {program.ageVerification} years or older
            </label>
          </div>
        )}

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
            <label htmlFor="termsAgreement" className="text-sm text-neutral-800">
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

        <Button
          text="Submit application"
          className="mt-4 enabled:border-[var(--brand)] enabled:bg-[var(--brand)] enabled:hover:bg-[var(--brand)] enabled:hover:ring-[var(--brand-ring)]"
          loading={isLoading}
        />
      </form>
    </FormProvider>
  );
}
