"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

export function Form() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/connect`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) {
      return;
    }

    setHasSubmitted(true);

    await executeAsync({
      ...data,
      termsUrl: data.termsUrl || null,
      helpUrl: data.helpUrl || null,
      workspaceId,
      step: "help-and-support",
    });
  };

  const [supportEmail] = watch(["supportEmail"]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <p className="text-sm text-neutral-600">
        These will be displayed to partners on their dashboard. You can add them
        later, but you have to provide your support email address before your
        first partner joins.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-800">
            Support email <span className="text-red-800">*</span>
          </label>
          <Input
            type="email"
            {...register("supportEmail", { required: true })}
            placeholder="support@dub.co"
            autoFocus={!isMobile}
            className="mt-2 w-full max-w-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">
            Help center URL
          </label>
          <Input
            type="url"
            {...register("helpUrl")}
            placeholder="https://dub.co/help"
            className="mt-2 w-full max-w-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">
            Terms of Service URL
          </label>
          <Input
            type="url"
            {...register("termsUrl")}
            placeholder="https://dub.co/legal/terms"
            className="mt-2 w-full max-w-none"
          />
        </div>
      </div>

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting || isPending || hasSubmitted}
        disabled={!supportEmail}
        type="submit"
      />
    </form>
  );
}
