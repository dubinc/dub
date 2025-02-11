"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useFolders from "@/lib/swr/use-folders";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { EmbedDocsSheet } from "@/ui/partners/embed-docs-sheet";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import { AnimatedSizeContainer, Button } from "@dub/ui";
import { CircleCheckFill, Code, LoadingSpinner } from "@dub/ui/icons";
import { cn, INFINITY_NUMBER, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { SettingsRow } from "./settings-row";

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

export function ProgramSettings() {
  const { program } = useProgram();

  return (
    <div className="flex flex-col gap-10">
      {program ? (
        <ProgramSettingsForm program={program} />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

type FormData = Pick<
  ProgramProps,
  | "commissionAmount"
  | "commissionType"
  | "commissionDuration"
  | "commissionInterval"
  | "defaultFolderId"
>;

function ProgramSettingsForm({ program }: { program: ProgramProps }) {
  const { folders, loading: loadingFolders } = useFolders();
  const { id: workspaceId, flags } = useWorkspace();
  const [isEmbedDocsOpen, setIsEmbedDocsOpen] = useState(false);

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      ...program,
      commissionAmount:
        program.commissionType === "flat"
          ? program.commissionAmount / 100
          : program.commissionAmount,
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = form;

  const [
    commissionAmount,
    commissionType,
    commissionDuration,
    commissionInterval,
  ] = watch([
    "commissionAmount",
    "commissionType",
    "commissionDuration",
    "commissionInterval",
  ]);

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
    <>
      <EmbedDocsSheet isOpen={isEmbedDocsOpen} setIsOpen={setIsEmbedDocsOpen} />
      <form
        className="rounded-lg border border-neutral-200 bg-white"
        onSubmit={handleSubmit(async (data) => {
          await executeAsync({
            workspaceId: workspaceId || "",
            programId: program.id,
            ...data,
            commissionAmount:
              data.commissionType === "flat"
                ? data.commissionAmount * 100
                : data.commissionAmount,
          });

          // Reset isDirty state
          reset(data);
        })}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-6">
          <h2 className="text-xl font-medium text-neutral-900">Program</h2>
          <Button
            type="button"
            text="Embed"
            onClick={() => setIsEmbedDocsOpen(true)}
            icon={<Code className="size-4" />}
            className="h-8 w-fit"
            variant="secondary"
          />
        </div>

        <div className="divide-y divide-neutral-200 px-6">
          <FormProvider {...form}>
            <Summary program={program} />
          </FormProvider>

          <SettingsRow
            heading="Commission"
            description="See how the affiliate will get rewarded"
          >
            <div className="-m-1">
              <AnimatedSizeContainer
                height
                transition={{ ease: "easeInOut", duration: 0.2 }}
              >
                <div className="p-1">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {commissionTypes.map((commissionType) => {
                      const isSelected =
                        commissionDuration &&
                        commissionDuration > 1 === commissionType.recurring
                          ? true
                          : false;

                      return (
                        <label
                          key={commissionType.label}
                          className={cn(
                            "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                            "transition-all duration-150",
                            isSelected &&
                              "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                          )}
                        >
                          <input
                            type="radio"
                            value={commissionType.label}
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setValue(
                                  "commissionDuration",
                                  commissionType.recurring ? 12 : 1,
                                  { shouldDirty: true },
                                );
                              }
                            }}
                          />
                          <div className="flex grow flex-col text-sm">
                            <span className="font-medium">
                              {commissionType.label}
                            </span>
                            <span>{commissionType.description}</span>
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
                  <div
                    className={cn(
                      "transition-opacity duration-200",
                      commissionDuration && commissionDuration > 1
                        ? "h-auto"
                        : "h-0 opacity-0",
                    )}
                    aria-hidden={
                      !(commissionDuration && commissionDuration > 1)
                    }
                    {...{
                      inert: !(commissionDuration && commissionDuration > 1),
                    }}
                  >
                    <div className="pt-6">
                      <label
                        htmlFor="duration"
                        className="pt-6 text-sm font-medium text-neutral-800"
                      >
                        Duration
                      </label>
                      <div className="relati`ve mt-2 rounded-md shadow-sm">
                        <select
                          className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setValue("commissionDuration", value, {
                              shouldDirty: true,
                            });
                          }}
                          value={commissionDuration ?? 1}
                        >
                          {(commissionInterval === "year"
                            ? [1, 2]
                            : [1, 3, 6, 12, 18, 24]
                          ).map((v) => (
                            <option value={v} key={v}>
                              {v} {pluralize(commissionInterval ?? "month", v)}
                            </option>
                          ))}
                          <option value={INFINITY_NUMBER}>Lifetime</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSizeContainer>
            </div>
          </SettingsRow>

          <SettingsRow
            heading="Payout"
            description="Set how much the affiliate will get rewarded"
          >
            <div className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="commissionType"
                  className="text-sm font-medium text-neutral-800"
                >
                  Payout model
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <select
                    className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    {...register("commissionType", { required: true })}
                  >
                    <option value="flat">Flat</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-neutral-800"
                >
                  Amount
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  {commissionType === "flat" && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                      $
                    </span>
                  )}
                  <input
                    className={cn(
                      "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      errors.commissionAmount &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                      commissionType === "flat" ? "pl-6 pr-12" : "pr-7",
                    )}
                    {...register("commissionAmount", {
                      required: true,
                      valueAsNumber: true,
                      min: 0,
                      max: commissionType === "flat" ? 1000 : 100,
                    })}
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                    {commissionType === "flat" ? "USD" : "%"}
                  </span>
                </div>
              </div>
            </div>
          </SettingsRow>

          {flags?.linkFolders && (
            <SettingsRow
              heading="Folder"
              description="All links created for this program will be added to this folder."
            >
              <div className="flex flex-col gap-6">
                <div>
                  <label
                    htmlFor="folder"
                    className="text-sm font-medium text-neutral-800"
                  >
                    Folder
                  </label>
                  <div className="relative mt-2 rounded-md shadow-sm">
                    {loadingFolders ? (
                      <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200" />
                    ) : (
                      <select
                        className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                        {...register("defaultFolderId")}
                        defaultValue={program.defaultFolderId || ""}
                      >
                        <option value="">None</option>
                        {folders?.map((folder) => (
                          <option value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </SettingsRow>
          )}
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
    </>
  );
}

function Summary({ program }: { program: ProgramProps }) {
  const { control } = useFormContext<FormData>();

  const data = useWatch({
    control,
    defaultValue: {
      ...program,
      commissionAmount:
        program.commissionType === "flat"
          ? program.commissionAmount * 100
          : program.commissionAmount,
    },
  }) as FormData;

  return (
    <SettingsRow heading="Summary">
      <div className="rounded-md border border-neutral-200 bg-[#f9f9f9]">
        <AnimatedSizeContainer
          height
          transition={{ ease: "easeInOut", duration: 0.2 }}
        >
          <p className="p-4 text-sm font-normal leading-relaxed text-neutral-900">
            <ProgramCommissionDescription
              program={{
                ...data,
                commissionAmount:
                  (data.commissionType === "flat"
                    ? data.commissionAmount * 100
                    : data.commissionAmount) || 0,
              }}
              amountClassName="text-blue-600"
            />
          </p>
        </AnimatedSizeContainer>
      </div>
    </SettingsRow>
  );
}
