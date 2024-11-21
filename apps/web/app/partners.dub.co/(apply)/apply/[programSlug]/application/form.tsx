"use client";

import { createProgramApplicationAction } from "@/lib/actions/partners/create-program-application";
import { Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Program } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

type FormData = {
  name: string;
  email: string;
  website?: string;
  proposal: string;
  comments?: string;
};

export function ProgramApplicationForm({
  program,
  defaultValues,
}: {
  program: Pick<Program, "id" | "slug" | "name">;
  defaultValues?: Partial<FormData>;
}) {
  const { isMobile } = useMediaQuery();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ defaultValues });

  const { executeAsync, isExecuting } = useAction(
    createProgramApplicationAction,
  );

  const isLoading = isSubmitting || isSubmitSuccessful || isExecuting;

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const response = await executeAsync({
          programId: program.id,
          ...data,
        });

        if (!response?.data?.ok) {
          toast.error(
            (response?.data as { message?: string }).message ??
              "Failed to submit application",
          );
          setError("root.serverError", {
            message: "Failed to submit application. Please try again.",
          });
          return;
        }

        toast.success("Application submitted successfully");
        router.push(
          `/apply/${program.slug}/application/success?${new URLSearchParams({
            applicationId: response.data.programApplicationId,
            ...("programEnrollmentId" in response.data && {
              enrollmentId: response.data.programEnrollmentId,
            }),
          }).toString()}`,
        );
      })}
      className="flex flex-col gap-6"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">Name</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
          )}
          placeholder="Acme, Inc."
          autoFocus={!isMobile}
          {...register("name", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Email</span>
        <input
          type="email"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.email
              ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
          )}
          placeholder="panic@thedis.co"
          {...register("email", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          Website / Social media channel
          <span className="font-normal text-neutral-500"> (optional)</span>
        </span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.website
              ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
          )}
          placeholder="https://example.com"
          {...register("website")}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          How do you plan to promote {program.name}?
        </span>
        <ReactTextareaAutosize
          className={cn(
            "mt-2 block max-h-48 min-h-12 w-full rounded-md focus:outline-none sm:text-sm",
            errors.proposal
              ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
          )}
          placeholder=""
          minRows={3}
          {...register("proposal", { required: true })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">
          Any additional questions or comments?
          <span className="font-normal text-neutral-500"> (optional)</span>
        </span>
        <ReactTextareaAutosize
          className={cn(
            "mt-2 block max-h-48 min-h-12 w-full rounded-md focus:outline-none sm:text-sm",
            errors.comments
              ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
          )}
          placeholder=""
          minRows={3}
          {...register("comments")}
        />
      </label>

      <Button
        text="Submit application"
        className="mt-4 border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
        loading={isLoading}
      />
    </form>
  );
}
