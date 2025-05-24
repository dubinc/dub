"use client";

import { ProgramColorPicker } from "@/ui/partners/program-color-picker";
import { FileUpload } from "@dub/ui";
import { Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils/src";
import { flightRouterStateSchema } from "next/dist/server/app-render/types";
import { ReactNode, useId } from "react";
import { Controller } from "react-hook-form";
import { useBrandingFormContext } from "./branding-form";

export function BrandingSettingsForm() {
  const { control } = useBrandingFormContext();

  return (
    <div>
      <div className="grid grid-cols-1 gap-10">
        <div className="flex flex-col gap-6">
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
                    className="h-14 rounded-lg border border-neutral-300 p-1"
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
  children,
}: {
  label: string;
  description?: string;
  inline?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-6",
        inline && "flex-row items-center",
      )}
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-800" htmlFor={id}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-neutral-500">{description}</p>
        )}
      </div>

      <div>{children(id)}</div>
    </div>
  );
}
