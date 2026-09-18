"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateApplicationSettingsAction } from "@/lib/actions/partners/update-application-settings";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ApplicationRequirementsDB, ProgramProps } from "@/lib/types";
import {
  EligibilityCondition,
  EligibilityRequirements,
  generateId,
} from "@/ui/partners/eligibility-requirements";
import { ProgramCategorySelect } from "@/ui/partners/program-category-select";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Sheet,
  Sparkle3,
  Switch,
  ToggleGroup,
  useEnterSubmit,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Category } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ApplicationAutoApproveSettings,
  AutoApproveUpdate,
  useApplicationAutoApproveSettings,
} from "./application-auto-approve-settings";

type ApplicationSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type FormData = {
  description: string;
  categories: Category[];
  eligibilityConditions: EligibilityCondition[];
  applicationScreeningCriteria: string;
  aiAutoApproveEnabled: boolean;
};

function ApplicationSettingsSheetContent({
  setIsOpen,
}: ApplicationSettingsSheetProps) {
  // Screening/AI config is workspace-scoped, so it is not part of ProgramProps
  const { program } = useProgram<
    ProgramProps & {
      applicationScreeningCriteria: string | null;
      aiAutoApproveEnabledAt: Date | null;
    }
  >();
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { groups, loading: groupsLoading } = useGroups({
    query: { sortBy: "createdAt", sortOrder: "asc" },
  });
  const [activeSection, setActiveSection] = useState<
    "applications" | "marketplace"
  >("applications");

  const hiddenEligibilityConditions = useRef<ApplicationRequirementsDB>([]);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      description: "",
      categories: [],
      eligibilityConditions: [],
      applicationScreeningCriteria: "",
      aiAutoApproveEnabled: false,
    },
  });

  useEffect(() => {
    if (!program) {
      return;
    }

    const requirements =
      (program.applicationRequirements as ApplicationRequirementsDB | null) ??
      [];

    hiddenEligibilityConditions.current = requirements.filter(
      (c) => c.key !== "country",
    );

    reset({
      description: program.description ?? "",
      categories: program.categories ?? [],
      eligibilityConditions: requirements
        .filter((c) => c.key === "country")
        .map((c) => ({ ...c, key: "country" as const, id: generateId() })),
      applicationScreeningCriteria: program.applicationScreeningCriteria ?? "",
      aiAutoApproveEnabled: Boolean(program.aiAutoApproveEnabledAt),
    });
  }, [program?.id, reset]);

  const { handleKeyDown } = useEnterSubmit();
  const autoApprove = useApplicationAutoApproveSettings(groups);
  const { executeAsync } = useAction(updateApplicationSettingsAction);

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      return;
    }

    const requests: Promise<void>[] = [
      executeAsync({
        workspaceId,
        description: data.description,
        categories: data.categories,
        eligibilityConditions: [
          ...data.eligibilityConditions
            .filter((c) => c.key && c.operator && c.value && c.value.length > 0)
            .map(({ id: _id, key, operator, value }) => ({
              key: key!,
              operator: operator!,
              value: value!,
            })),
          ...hiddenEligibilityConditions.current,
        ],
        applicationScreeningCriteria: data.applicationScreeningCriteria,
        aiAutoApproveEnabled: data.aiAutoApproveEnabled,
      }).then((result) => {
        if (result?.serverError || result?.validationErrors) {
          throw new Error(
            parseActionError(result, "Failed to update application settings."),
          );
        }
      }),
      ...autoApprove.pendingUpdates.map((update) =>
        updateGroupAutoApprove({ workspaceId, ...update }),
      ),
    ];

    const results = await Promise.allSettled(requests);

    await mutatePrefix([`/api/programs/${defaultProgramId}`, "/api/groups"]);

    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (failure) {
      toast.error(
        failure.reason instanceof Error
          ? failure.reason.message
          : "Failed to update application settings.",
      );
      return;
    }

    toast.success("Application settings updated");
    setIsOpen(false);
  };

  const hasChanges = isDirty || autoApprove.pendingUpdates.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Application settings
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        {program?.addedToMarketplaceAt && (
          <ToggleGroup
            className="flex h-10 w-full items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5"
            optionClassName="flex h-9 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium normal-case"
            indicatorClassName="rounded-md border border-neutral-100 bg-white shadow-[0px_2px_2px_0px_#00000008]"
            options={[
              { value: "applications", label: "Applications" },
              { value: "marketplace", label: "Marketplace" },
            ]}
            selected={activeSection}
            selectAction={(value) =>
              setActiveSection(value as "applications" | "marketplace")
            }
          />
        )}

        {(!program?.addedToMarketplaceAt ||
          activeSection === "applications") && (
          <>
            <div className="space-y-3">
              <div>
                <h4 className="text-content-emphasis text-sm font-medium leading-5 tracking-[-0.02em]">
                  Eligibility requirements (optional)
                </h4>
                <p className="text-xs font-normal leading-4 tracking-[-0.02em] text-neutral-500">
                  Only eligible partners can apply.{" "}
                  <Link
                    href="https://dub.co/help/article/program-applications#eligibility-requirements"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Learn more
                  </Link>
                </p>
              </div>

              <Controller
                control={control}
                name="eligibilityConditions"
                render={({ field }) => (
                  <EligibilityRequirements
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-content-emphasis flex items-center gap-1 text-sm font-medium leading-5 tracking-[-0.02em]">
                  <Sparkle3 variant="fill" className="size-4 shrink-0" />
                  Application screening (optional)
                </h4>
                <p className="text-xs font-normal leading-4 tracking-[-0.02em] text-neutral-500">
                  Automatically reject applications that match criteria you
                  describe.
                </p>
              </div>

              <textarea
                {...register("applicationScreeningCriteria")}
                rows={4}
                placeholder="Partners that offer SEO, backlinking, paid advertising, or affiliate marketing services."
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full rounded-lg border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.applicationScreeningCriteria &&
                    "border-red-600 focus:border-red-600 focus:ring-red-600",
                )}
              />
            </div>

            <div className="space-y-6">
              <ApplicationAutoApproveSettings
                loading={groupsLoading}
                autoApprove={autoApprove}
              />

              <label className="flex cursor-pointer select-none items-start gap-3">
                <Controller
                  control={control}
                  name="aiAutoApproveEnabled"
                  render={({ field }) => (
                    <span className="mt-0.5 inline-flex">
                      <Switch
                        checked={field.value}
                        fn={field.onChange}
                        disabled={groupsLoading}
                      />
                    </span>
                  )}
                />
                <span>
                  <span className="flex items-center gap-1 text-sm font-medium leading-5 tracking-[-0.02em] text-neutral-800">
                    <Sparkle3 variant="fill" className="size-4 shrink-0" />
                    Hold spam applications for review
                  </span>
                  <span className="mt-0.5 block text-xs font-normal leading-4 tracking-[-0.02em] text-neutral-500">
                    When auto-approving, high-confidence spam or clearly
                    irrelevant applications stay pending.
                  </span>
                </span>
              </label>
            </div>
          </>
        )}

        {program?.addedToMarketplaceAt && activeSection === "marketplace" && (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-neutral-800"
              >
                Product description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  placeholder="Describe your program for the marketplace..."
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.description &&
                      "border-red-600 focus:border-red-600 focus:ring-red-600",
                  )}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  This description will be displayed in the program marketplace.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Product categories
              </label>
              <div className="mt-1">
                <Controller
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <ProgramCategorySelect
                      selected={field.value}
                      onChange={field.onChange}
                      buttonProps={{
                        className: cn(errors.categories && "border-red-600"),
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            variant="secondary"
            text="Cancel"
            disabled={isSubmitting}
            className="h-8 w-fit px-3"
            type="button"
            onClick={() => setIsOpen(false)}
          />
          <Button
            text="Save"
            className="h-8 w-fit px-3"
            loading={isSubmitting}
            disabled={!hasChanges}
            type="submit"
          />
        </div>
      </div>
    </form>
  );
}

async function updateGroupAutoApprove({
  workspaceId,
  groupId,
  autoApprovePartners,
  applyToAllGroups,
}: AutoApproveUpdate & { workspaceId: string }) {
  const response = await fetch(
    `/api/groups/${groupId}?workspaceId=${workspaceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoApprovePartners,
        ...(applyToAllGroups && {
          updateAutoApprovePartnersForAllGroups: true,
        }),
      }),
    },
  );

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(
      error?.message || "Failed to update auto-approve settings.",
    );
  }
}

export function ApplicationSettingsSheet({
  isOpen,
  ...rest
}: ApplicationSettingsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <ApplicationSettingsSheetContent {...rest} />
    </Sheet>
  );
}

export function useApplicationSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    applicationSettingsSheet: (
      <ApplicationSettingsSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
