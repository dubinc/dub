"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useFolders from "@/lib/swr/use-folders";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { ProgramLinkConfiguration } from "@/ui/partners/program-link-configuration";
import { Badge, Button } from "@dub/ui";
import { CircleCheckFill, LoadingSpinner } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "../program-settings-row";

type FormData = Pick<ProgramProps, "domain" | "url" | "linkStructure">;

export function LinksSettings() {
  const { program } = useProgram();

  return (
    <div className="flex flex-col gap-10">
      {program ? (
        <LinksSettingsForm program={program} />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

function LinksSettingsForm({ program }: { program: ProgramProps }) {
  const { id: workspaceId } = useWorkspace();
  const { folders, loading: loadingFolders } = useFolders();

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
        <SettingsRow heading="Default Referral Link">
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

        <SettingsRow heading="Link type">
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
                    type.comingSoon
                      ? "cursor-default opacity-80"
                      : "hover:bg-neutral-50",
                    "transition-all duration-150",
                    isSelected &&
                      "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  )}
                >
                  <input
                    type="radio"
                    value={type.id}
                    className="hidden"
                    disabled={type.comingSoon === true}
                    {...register("linkStructure")}
                  />

                  <div className="flex grow flex-col text-sm">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-neutral-600">{type.example}</span>
                  </div>

                  {type.comingSoon ? (
                    <Badge variant="blueGradient">Coming soon</Badge>
                  ) : (
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  )}
                </label>
              );
            })}
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
