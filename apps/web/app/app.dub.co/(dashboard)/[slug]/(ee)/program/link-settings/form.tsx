"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { ProgramLinkConfiguration } from "@/ui/partners/program-link-configuration";
import { Badge, Button, NumberStepper, Tooltip } from "@dub/ui";
import { CircleCheckFill, CircleQuestion } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "../program-settings-row";

type FormData = Pick<
  ProgramProps,
  "domain" | "url" | "linkStructure" | "urlValidationMode" | "maxPartnerLinks"
>;

const URL_VALIDATION_MODES = [
  {
    value: "domain",
    label: "Domain",
    description: "Partners can create any referral links on your domain",
  },
  {
    value: "exact",
    label: "Exact",
    description:
      "Partners can only create referral links from your destination URL",
  },
];

export function LinksSettingsForm() {
  const { program } = useProgram();

  if (!program) {
    return null;
  }

  return <LinksSettingsFormInner program={program} />;
}

function LinksSettingsFormInner({ program }: { program: ProgramProps }) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      domain: program.domain,
      url: program.url,
      linkStructure: program.linkStructure,
      urlValidationMode: program.urlValidationMode,
      maxPartnerLinks: program.maxPartnerLinks,
    },
  });

  const { executeAsync } = useAction(updateProgramAction, {
    async onSuccess() {
      toast.success("Program updated successfully.");
      mutate(`/api/programs/${program.id}?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update program.");
    },
  });

  const [domain, url] = watch(["domain", "url"]);

  return (
    <form
      className="rounded-lg border border-neutral-200 bg-white"
      onSubmit={handleSubmit(async (data) => {
        await executeAsync({
          ...data,
          workspaceId: workspaceId!,
        });

        // Reset isDirty state
        reset({}, { keepValues: true });
      })}
    >
      <div className="divide-y divide-neutral-200 px-6">
        <SettingsRow heading="Default partner link">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <ProgramLinkConfiguration
                domain={domain}
                url={url}
                onDomainChange={(domain) =>
                  setValue("domain", domain, { shouldDirty: true })
                }
                onUrlChange={(url) =>
                  setValue("url", url, { shouldDirty: true })
                }
                hideLinkPreview
              />
            </div>
          </div>
        </SettingsRow>

        <SettingsRow heading="Link structure">
          <div className="grid grid-cols-1 gap-3">
            {getLinkStructureOptions({
              domain: program.domain,
              url: program.url,
            }).map((type) => {
              const isSelected = type.id === watch("linkStructure");

              return (
                <label
                  key={type.id}
                  className={cn(
                    "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                    "transition-all duration-150 hover:bg-neutral-50",
                    isSelected &&
                      "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  )}
                >
                  <input
                    type="radio"
                    value={type.id}
                    className="hidden"
                    {...register("linkStructure")}
                  />

                  <div className="flex grow flex-col text-sm">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-neutral-600">{type.example}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {type.recommended && (
                      <Badge variant="blueGradient">Recommended</Badge>
                    )}
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </SettingsRow>

        <SettingsRow heading="Advanced settings">
          <div className="space-y-6">
            <div className="flex flex-col">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-800">
                  Max partner links
                </span>
                <Tooltip content="Maximum number of referral links a partner can create.">
                  <div className="text-neutral-400">
                    <CircleQuestion className="size-4" />
                  </div>
                </Tooltip>
              </div>
              <NumberStepper
                value={watch("maxPartnerLinks")}
                onChange={(v) =>
                  setValue("maxPartnerLinks", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                min={1}
                max={999}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Link restriction
              </label>
              <div className="grid grid-cols-1 gap-3">
                {URL_VALIDATION_MODES.map((mode) => {
                  const isSelected = mode.value === watch("urlValidationMode");

                  return (
                    <label
                      key={mode.value}
                      className={cn(
                        "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                        "hover:bg-neutral-50",
                        "transition-all duration-150",
                        isSelected &&
                          "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                      )}
                    >
                      <input
                        type="radio"
                        value={mode.value}
                        className="hidden"
                        {...register("urlValidationMode")}
                      />

                      <div className="flex grow flex-col text-sm">
                        <span className="font-medium">{mode.label}</span>
                        <span className="text-neutral-600">
                          {mode.description}
                        </span>
                      </div>

                      <CircleCheckFill
                        className={cn(
                          "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                          isSelected && "scale-100 opacity-100",
                        )}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </SettingsRow>
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
