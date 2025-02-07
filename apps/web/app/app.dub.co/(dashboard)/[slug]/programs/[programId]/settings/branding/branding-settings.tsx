"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { PropsWithChildren, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

const commissionTypes = [
  {
    label: "One-off",
    description: "Pay a one-time payout",
    recurring: false,
  },
  {
    label: "Recurring",
    description: "Pay an ongoing payout",
    recurring: true,
  },
];

export function BrandingSettings() {
  const { program } = useProgram();

  return (
    <div className="flex flex-col gap-10">
      {program ? (
        <BrandingSettingsForm program={program} />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

type FormData = Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

function BrandingSettingsForm({ program }: { program: ProgramProps }) {
  const id = useId();

  const { id: workspaceId } = useWorkspace();

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: program,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = form;

  const { executeAsync } = useAction(updateProgramAction, {
    async onSuccess() {
      toast.success("Program updated successfully.");
      mutate(`/api/programs/${program.id}?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      console.error(error);
      toast.error("Failed to update program.");
    },
  });

  return (
    <form
      className="rounded-lg border border-neutral-200 bg-white"
      onSubmit={handleSubmit(async (data) => {
        await executeAsync({
          workspaceId: workspaceId || "",
          programId: program.id,
          ...data,
        });

        // Reset isDirty state
        reset(data);
      })}
    >
      <div className="grid grid-cols-1 gap-10 px-6 py-8 md:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Branding styles
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Change the default styles to match your brand across the Dub
              Partner experiences.
            </p>
          </div>

          <Divider />

          <FormRow
            label="Logo"
            description="A square logo that will be used in various parts of your program"
          ></FormRow>

          <Divider />

          <FormRow
            label="Wordmark"
            description="A full-sized logo used on the program application form"
          ></FormRow>

          <Divider />

          <FormRow
            label="Theme color"
            description="Select the color to match your brand"
          ></FormRow>

          <Divider />
        </div>

        <div className="rounded-xl bg-neutral-50 px-8 py-6">
          <span className="text-sm font-semibold text-black">Preview</span>
        </div>
      </div>

      <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
        <div>
          <Button
            text="Save changes"
            className="h-8"
            loading={isSubmitting}
            disabled={!isValid || !isDirty}
          />
        </div>
      </div>
    </form>
  );
}

const Divider = () => <hr className="border-neutral-200" />;

function FormRow({
  label,
  description,
  children,
}: PropsWithChildren<{ label: string; description: string }>) {
  return (
    <div className="flex items-center">
      <div>
        <label className="text-sm font-medium text-neutral-800">{label}</label>
        <p className="mt-2 text-xs text-neutral-500">{description}</p>
      </div>

      <div>{children}</div>
    </div>
  );
}
