"use client";

import { updateProgramAction } from "@/lib/actions/update-program";
import useDomains from "@/lib/swr/use-domains";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { Badge, Button } from "@dub/ui";
import { CircleCheckFill, LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "./settings-row";

type FormData = Pick<
  ProgramProps,
  "defaultDomain" | "destinationUrl" | "cookieLength"
>;

const linkStructures = [
  {
    label: "Short link",
    example: "refer.dub.co/steven",
    comingSoon: false,
  },
  {
    label: "Query parameter",
    example: "dub.co?via=steven",
    comingSoon: true,
  },
  {
    label: "Dynamic path",
    example: "dub.co/refer/steven",
    comingSoon: true,
  },
];

export function TrackingSettings() {
  const { program } = useProgram();

  return (
    <div className="flex flex-col gap-10">
      {program ? (
        <TrackingSettingsForm program={program} />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

function TrackingSettingsForm({ program }: { program: ProgramProps }) {
  const { id: workspaceId } = useWorkspace();

  const { allDomains: domains, loading: loadingDomains } = useDomains();

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      defaultDomain: program.defaultDomain,
      destinationUrl: program.destinationUrl,
      cookieLength: program.cookieLength,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
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
          workspaceId: workspaceId!,
          programId: program.id,
          ...data,
        });

        // Reset isDirty state
        reset({}, { keepValues: true });
      })}
    >
      <div className="flex items-center border-b border-neutral-200 p-6">
        <h2 className="text-xl font-medium text-neutral-900">Tracking</h2>
      </div>

      <div className="divide-y divide-neutral-200 px-6">
        <SettingsRow heading="Default Referral Link">
          <div className="flex flex-col gap-6">
            <div>
              <label
                htmlFor="defaultDomain"
                className="text-sm font-medium text-neutral-800"
              >
                Default domain
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <select
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register("defaultDomain", {
                    required: true,
                  })}
                  disabled={loadingDomains}
                >
                  <option value="">Select a domain</option>
                  {domains?.map((domain) => (
                    <option
                      value={domain.slug}
                      key={domain.slug}
                      selected={domain.slug === program.defaultDomain}
                    >
                      {domain.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="destinationUrl"
                className="text-sm font-medium text-neutral-800"
              >
                Destination URL
              </label>
              <div className="mt-2 rounded-md shadow-sm">
                <input
                  type="url"
                  placeholder="https://example.com"
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  )}
                  {...register("destinationUrl", {
                    required: true,
                  })}
                />
              </div>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow heading="Link structure">
          <div className="grid grid-cols-1 gap-3">
            {linkStructures.map((linkStructure, idx) => {
              const isSelected = idx === 0;

              return (
                <label
                  key={linkStructure.label}
                  className={cn(
                    "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                    linkStructure.comingSoon
                      ? "cursor-default opacity-80"
                      : "hover:bg-neutral-50",
                    "transition-all duration-150",
                    isSelected &&
                      "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  )}
                >
                  <input
                    type="radio"
                    value={linkStructure.label}
                    className="hidden"
                    checked={isSelected}
                    disabled={linkStructure.comingSoon}
                    readOnly
                  />
                  <div className="flex grow flex-col text-sm">
                    <span className="font-medium">{linkStructure.label}</span>
                    <span className="text-neutral-600">
                      {linkStructure.example}
                    </span>
                  </div>
                  {linkStructure.comingSoon ? (
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
          <div className="mt-6">
            <label>
              <span className="text-sm font-medium text-neutral-800">
                Cookie length
              </span>
              <div className="relative mt-2 rounded-md shadow-sm">
                <select
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register("cookieLength", {
                    required: true,
                    valueAsNumber: true,
                  })}
                >
                  {[7, 14, 30, 60, 90, 180].map((v) => (
                    <option value={v} key={v}>
                      {v} days
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <p className="mt-2 text-xs text-neutral-400">
              Days your cookie will remain active and track referrals
            </p>
          </div>

          <div className="mt-6">
            <span className="text-sm font-medium text-neutral-800">
              Installation
            </span>
            <p className="mt-2 text-sm text-neutral-500">
              View our{" "}
              <a
                href="https://dub.co/docs/sdks/client-side/introduction"
                target="_blank"
                className="underline transition-colors duration-75 hover:text-neutral-600"
              >
                installation guides
              </a>{" "}
              to add Dub Conversions to your website.
            </p>
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
