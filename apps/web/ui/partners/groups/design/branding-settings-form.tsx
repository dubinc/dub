"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { ProgramColorPicker } from "@/ui/partners/program-color-picker";
import { FileUpload, InfoTooltip } from "@dub/ui";
import { Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { ReactNode, useId } from "react";
import { Controller } from "react-hook-form";
import { useBrandingContext } from "./branding-context-provider";
import { useBrandingFormContext } from "./branding-form";

export function BrandingSettingsForm() {
  const { slug } = useWorkspace();
  const { control } = useBrandingFormContext();

  const { group, defaultGroup } = useBrandingContext();

  return (
    <div>
      <div className="grid grid-cols-1 gap-10">
        <div className="flex flex-col gap-6">
          <FormRow
            label="Brand elements"
            description={
              <>
                Set the style and content for{" "}
                {group.slug === DEFAULT_PARTNER_GROUP.slug ? (
                  "the default group and its dependents"
                ) : (
                  <strong className="text-content-emphasis font-semibold">
                    this group only
                  </strong>
                )}
                .
              </>
            }
          />

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
                    imageSrc={field.value ?? defaultGroup.logo}
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
                    imageSrc={field.value ?? defaultGroup.wordmark}
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
                    color={field.value ?? defaultGroup.brandColor}
                    onChange={field.onChange}
                    id={id}
                  />
                )}
              />
            )}
          </FormRow>
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
