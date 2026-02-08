"use client";

import { updateGroupBrandingAction } from "@/lib/actions/partners/update-group-branding";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramColorPicker } from "@/ui/partners/program-color-picker";
import { Button, FileUpload, InfoTooltip } from "@dub/ui";
import { Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { useAction } from "next-safe-action/hooks";
import { ReactNode, useCallback, useId, useState } from "react";
import { Controller, useFormState } from "react-hook-form";
import { toast } from "sonner";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";

const FIELDS = ["logo", "wordmark", "brandColor"] as const;

export function BrandingSettingsForm() {
  const { id: workspaceId } = useWorkspace();

  const { group, mutateGroup } = useBrandingContext();
  const { control, getValues, resetField } = useBrandingFormContext();
  const { dirtyFields } = useFormState({ control });

  const isDirty = FIELDS.some((field) => dirtyFields[field]);

  const [isLoading, setIsLoading] = useState(false);

  const { executeAsync } = useAction(updateGroupBrandingAction, {
    async onSuccess() {
      toast.success("Brand elements updated successfully.");

      FIELDS.forEach((field) =>
        resetField(field, { keepDirty: false, defaultValue: getValues(field) }),
      );

      await mutateGroup();
      setIsLoading(false);
    },
    onError({ error }) {
      const message = error.serverError || "Failed to update brand elements.";
      toast.error(message);
      setIsLoading(false);
    },
  });

  const handleSave = useCallback(() => {
    if (!workspaceId) return;

    setIsLoading(true);
    executeAsync({
      workspaceId,
      groupId: group.id,
      ...Object.fromEntries(FIELDS.map((field) => [field, getValues(field)])),
    });
  }, [getValues, group.id, workspaceId]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-10">
        <div className="flex flex-col gap-6">
          <FormRow
            label="Brand elements"
            description={
              <>
                Set the style and content for this partner group.{" "}
                <a
                  className="cursor-help font-semibold underline decoration-dotted underline-offset-2"
                  href="https://dub.co/help/article/program-landing-page"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
                .
              </>
            }
          ></FormRow>

          <Divider />

          <FormRow
            label="Logo"
            tooltip="A square 1:1 logo used in various parts of the partner portal."
            required
          >
            {(id) => (
              <Controller
                control={control}
                name="logo"
                render={({ field }) => (
                  <FileUpload
                    id={id}
                    accept="images"
                    className="h-20 rounded-lg border border-neutral-300 p-1"
                    iconClassName="size-4 text-neutral-800"
                    previewClassName="object-contain"
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

          <FormRow
            label="Wordmark"
            tooltip="Optional full-sized wordmark used in the navigation menu bar."
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
                    className="h-20 rounded-lg border border-neutral-300 p-1"
                    iconClassName="size-4 text-neutral-800"
                    previewClassName="object-contain"
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

          <FormRow label="Brand color" inline>
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

          <Button
            type="button"
            text="Save"
            className="h-8 rounded-lg"
            disabled={!isDirty}
            loading={isLoading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

const Divider = () => <hr className="border-neutral-300" />;

function FormRow({
  label,
  description,
  inline = false,
  required,
  tooltip,
  children,
}: {
  label: string;
  description?: string | ReactNode;
  inline?: boolean;
  children?: (id: string) => ReactNode;
  required?: boolean;
  tooltip?: string;
}) {
  const id = useId();

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-5",
        inline && "flex-row items-center",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-neutral-800" htmlFor={id}>
            {label}

            {required && (
              <span className="text-sm font-medium text-neutral-500">
                {" "}
                (required)
              </span>
            )}
          </label>

          {tooltip && <InfoTooltip content={tooltip} />}
        </div>

        {description && (
          <p className="text-xs text-neutral-500">{description}</p>
        )}
      </div>

      {children?.(id)}
    </div>
  );
}
