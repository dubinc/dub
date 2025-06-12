"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "../program-settings-row";

type FormData = Pick<ProgramProps, "supportEmail" | "helpUrl" | "termsUrl">;

export function ProgramCommunication() {
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      supportEmail: program?.supportEmail,
      helpUrl: program?.helpUrl,
      termsUrl: program?.termsUrl,
    },
  });

  const { executeAsync } = useAction(updateProgramAction, {
    onSuccess: async () => {
      toast.success("Communication settings updated successfully.");
      await mutate(`/api/programs/${program?.id}?workspaceId=${workspaceId}`);
    },
    onError: ({ error }) => {
      toast.error(
        parseActionError(error, "Failed to update communication settings."),
      );
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
      helpUrl: data.helpUrl || null,
      termsUrl: data.termsUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="p-6">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
            Help and Support
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Configure the support email, help center, and terms of service for
            your program.
          </p>
        </div>

        <div className="divide-y divide-neutral-200 border-t border-neutral-200 px-6">
          <SettingsRow
            heading="Support Email"
            description="For partner support requests"
            required
          >
            <div className="flex items-center justify-end">
              <div className="w-full max-w-md">
                <input
                  type="email"
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="support@dub.co"
                  {...register("supportEmail", {
                    required: true,
                  })}
                />
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Help Center"
            description="Program help articles and documentation"
          >
            <div className="flex items-center justify-end">
              <div className="w-full max-w-md">
                <input
                  type="url"
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register("helpUrl")}
                  placeholder="https://dub.co/help"
                />
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Terms of Service"
            description="Program terms of service and legal information"
          >
            <div className="flex items-center justify-end">
              <div className="w-full max-w-md">
                <input
                  type="url"
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register("termsUrl")}
                  placeholder="https://dub.co/legal/terms"
                />
              </div>
            </div>
          </SettingsRow>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          <Button
            text="Save changes"
            variant="primary"
            className="h-8 w-fit"
            loading={isSubmitting}
            disabled={!isDirty || !isValid}
          />
        </div>
      </div>
    </form>
  );
}
