"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { PROGRAM_IMPORT_SOURCES } from "@/lib/partners/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Plus, Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";

const MAX_PARTNERS = 5;

export function Form() {
  const router = useRouter();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const {
    id: workspaceId,
    slug: workspaceSlug,
    mutate,
    loading,
  } = useWorkspace();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const { fields, append, remove } = useFieldArray({
    name: "partners",
    control,
  });

  const [rewardful, tolt] = watch(["rewardful", "tolt"]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/support`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) return;
    setHasSubmitted(true);
    await executeAsync({
      ...data,
      // remove empty emails
      partners:
        data.partners?.filter((partner) => partner.email.trim()) || null,
      workspaceId,
      step: "invite-partners",
    });
  };

  const buttonDisabled = isSubmitting || isPending || loading || hasSubmitted;

  const isImporting = rewardful || tolt;
  const importSource = isImporting
    ? rewardful
      ? PROGRAM_IMPORT_SOURCES[0]
      : PROGRAM_IMPORT_SOURCES[1]
    : null;

  return (
    <div className="space-y-6">
      {importSource && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Invite new partners in addition to those being imported.
          </p>

          <div className="mt-10 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-full bg-blue-600">
                <img
                  src={importSource.image}
                  alt={importSource.value}
                  className="size-5"
                />
              </div>
              <span className="text-sm font-medium text-neutral-800">
                Affiliates importing
              </span>
            </div>
            <span className="text-sm text-neutral-600">
              {rewardful?.affiliates || tolt?.affiliates || 0}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-1">
              <span className="mb-1.5 block text-sm font-medium text-neutral-800">
                Email
              </span>
              <div className="relative w-full">
                <Input
                  {...register(`partners.${index}.email`)}
                  type="email"
                  placeholder="panic@thedis.co"
                  className={cn("max-w-none", fields.length > 1 && "mr-12")}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Trash className="size-3.5 text-neutral-600" />}
                    onClick={() => remove(index)}
                    aria-label="Remove partner"
                    className="absolute right-2 top-1/2 h-auto w-auto -translate-y-1/2 p-2.5"
                  />
                )}
              </div>
            </div>
          ))}

          <div className="mb-4">
            <Button
              text="Add partner"
              variant="secondary"
              icon={<Plus className="size-4" />}
              className="w-fit"
              onClick={() => {
                if (fields.length < MAX_PARTNERS) {
                  append({ email: "" });
                }
              }}
              disabled={fields.length >= MAX_PARTNERS}
            />
          </div>

          {fields.length >= MAX_PARTNERS && (
            <p className="text-sm text-neutral-600">
              You can add up to {MAX_PARTNERS} partners at a time
            </p>
          )}
        </div>

        <Button
          text="Continue"
          className="mt-6 w-full"
          loading={isSubmitting || isPending || hasSubmitted}
          disabled={buttonDisabled}
          type="submit"
        />
      </form>
    </div>
  );
}
