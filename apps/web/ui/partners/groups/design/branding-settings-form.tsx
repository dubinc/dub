"use client";

import { ProgramColorPicker } from "@/ui/partners/program-color-picker";
import { FileUpload, InfoTooltip } from "@dub/ui";
import { Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { flightRouterStateSchema } from "next/dist/server/app-render/types";
import { ReactNode, useId } from "react";
import { Controller } from "react-hook-form";
import { useApplicationFormContext } from "./branding-form";

export function BrandingSettingsForm() {
  const { control } = useApplicationFormContext();

  return (
    <div>
      <div className="grid grid-cols-1 gap-10">
        <div className="flex flex-col gap-6">
          <FormRow
            label="Brand elements"
            description={(
              <>
                Set the group style and content for <span className="font-semibold">all groups</span>. This will be how it appears to all your partners.
              </>
            )}
          />

          <Divider />

          <FormRow
            label="Icon"
            tooltip="A smaller representation of your logo, and must be square"
            required
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
            label="Logo"
            tooltip="Optional full-sized logo used in place of the icon where applicable"
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

            {required && <span className="text-sm font-medium text-neutral-500"> (required)</span>}
          </label>

          {tooltip && (
            <InfoTooltip content={tooltip} />
          )}
        </div>

        {description && (
          <p className="text-xs text-neutral-500">{description}</p>
        )}
      </div>

      {children?.(id)}
    </div>
  );
}
