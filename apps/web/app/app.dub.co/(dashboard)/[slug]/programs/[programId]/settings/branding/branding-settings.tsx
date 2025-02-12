"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { ProgramColorPicker } from "@/ui/partners/program-color-picker";
import { Button, FileUpload } from "@dub/ui";
import { LoadingSpinner, Plus } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { flightRouterStateSchema } from "next/dist/server/app-render/types";
import { ReactNode, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { BrandingPreview } from "./branding-preview";

export function BrandingSettings() {
  const { program } = useProgram();

  return program ? (
    <BrandingSettingsForm program={program} />
  ) : (
    <div className="flex h-32 items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

type FormData = Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

function BrandingSettingsForm({ program }: { program: ProgramProps }) {
  const { id: workspaceId } = useWorkspace();

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: program,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = form;

  const { executeAsync } = useAction(updateProgramAction, {
    async onSuccess(res) {
      if (res.data?.ok) {
        toast.success("Program updated successfully.");
        mutate(`/api/programs/${program.id}?workspaceId=${workspaceId}`);
      } else {
        toast.error("Failed to update program.");
        return false;
      }
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
      <div className="grid grid-cols-1 gap-10 px-6 py-8 min-[1200px]:grid-cols-[340px_minmax(0,1fr)]">
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
          >
            {(id) => (
              <Controller
                control={control}
                name="logo"
                rules={{ required: flightRouterStateSchema }}
                render={({ field }) => (
                  <FileUpload
                    id={id}
                    accept="images"
                    className="size-14 rounded-lg border border-neutral-300 p-1"
                    iconClassName="size-4 text-neutral-800"
                    icon={Plus}
                    variant="plain"
                    imageSrc={field.value}
                    readFile
                    onChange={({ src }) => field.onChange(src)}
                    content={null}
                    maxFileSizeMB={2}
                  />
                )}
              />
            )}
          </FormRow>

          <Divider />

          <FormRow
            label="Wordmark"
            description="A full-sized logo used on the program application form"
          >
            {(id) => (
              <Controller
                control={control}
                name="wordmark"
                rules={{ required: false }}
                render={({ field }) => (
                  <FileUpload
                    id={id}
                    accept="images"
                    className="h-14 rounded-lg border border-neutral-300 p-1"
                    iconClassName="size-4 text-neutral-800"
                    icon={Plus}
                    variant="plain"
                    imageSrc={field.value}
                    readFile
                    onChange={({ src }) => field.onChange(src)}
                    content={null}
                    maxFileSizeMB={2}
                  />
                )}
              />
            )}
          </FormRow>

          <Divider />

          <FormRow
            label="Theme color"
            description="Select the color to match your brand"
          >
            {(id) => (
              <Controller
                control={control}
                name="brandColor"
                render={({ field }) => (
                  <ProgramColorPicker
                    color={field.value}
                    onChange={field.onChange}
                    id={id}
                  />
                )}
              />
            )}
          </FormRow>

          <Divider />
        </div>

        <BrandingPreview />
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
}: {
  label: string;
  description: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <label className="text-sm font-medium text-neutral-800" htmlFor={id}>
          {label}
        </label>
        <p className="mt-2 text-xs text-neutral-500">{description}</p>
      </div>

      <div>{children(id)}</div>
    </div>
  );
}
