"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateApplicationSettingsAction } from "@/lib/actions/partners/update-application-settings";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ApplicationRequirementsDB } from "@/lib/types";
import {
  ELIGIBILITY_CONDITION_KEYS,
  EligibilityCondition,
  EligibilityRequirements,
  generateId,
} from "@/ui/partners/eligibility-requirements";
import { ProgramCategorySelect } from "@/ui/partners/program-category-select";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, ToggleGroup, useEnterSubmit } from "@dub/ui";
import { cn } from "@dub/utils";
import { Category } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ApplicationAutoApproval,
  AutoApprovalUpdate,
  useProgramAutoApproval,
} from "./application-auto-approval";

type ApplicationSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type FormData = {
  description: string;
  categories: Category[];
  eligibilityConditions: EligibilityCondition[];
};

type Section = "applications" | "marketplace";

const EMPTY_FORM_VALUES: FormData = {
  description: "",
  categories: [],
  eligibilityConditions: [],
};

function ApplicationSettingsSheetContent({
  setIsOpen,
}: ApplicationSettingsSheetProps) {
  const { program } = useProgram();
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { groups, loading: groupsLoading } = useGroups({
    query: { sortBy: "createdAt", sortOrder: "asc" },
  });

  const [activeSection, setActiveSection] = useState<Section>("applications");

  // Memoized so the generated condition IDs stay stable: react-hook-form
  // deep-compares `values` and would otherwise reset the form on every render
  const formValues = useMemo<FormData | undefined>(
    () =>
      program
        ? {
            description: program.description ?? "",
            categories: program.categories ?? [],
            eligibilityConditions: (
              (program.applicationRequirements as ApplicationRequirementsDB | null) ??
              []
            )
              .filter((c) =>
                (ELIGIBILITY_CONDITION_KEYS as readonly string[]).includes(
                  c.key,
                ),
              )
              .map((c) => ({ ...c, id: generateId() })),
          }
        : undefined,
    [program],
  );

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    // The trigger only opens the sheet once the program has loaded, so the
    // saved values are normally available on mount. If the program (re)loads
    // while the sheet is open, `values` refreshes the form without discarding
    // unsaved edits.
    defaultValues: formValues ?? EMPTY_FORM_VALUES,
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

  const { handleKeyDown } = useEnterSubmit();

  // Auto-approve edits are staged until the form is saved
  const autoApproval = useProgramAutoApproval(groups);

  const { executeAsync } = useAction(updateApplicationSettingsAction);

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) return;

    const requests: Promise<void>[] = [];

    if (isDirty) {
      requests.push(
        executeAsync({
          workspaceId,
          description: data.description,
          categories: data.categories,
          eligibilityConditions: data.eligibilityConditions
            .filter((c) => c.key && c.operator && c.value && c.value.length > 0)
            .map(({ id: _id, key, operator, value }) => ({
              key: key!,
              operator: operator!,
              value: value!,
            })),
        }).then((result) => {
          if (result?.serverError || result?.validationErrors) {
            throw new Error(
              parseActionError(
                result,
                "Failed to update application settings.",
              ),
            );
          }
        }),
      );
    }

    requests.push(
      ...autoApproval.pendingUpdates.map((update) =>
        updateGroupAutoApproval({ workspaceId, ...update }),
      ),
    );

    const results = await Promise.allSettled(requests);

    // Refresh even if a request failed, so the sheet reflects what was saved
    await mutatePrefix([
      `/api/programs/${defaultProgramId}`,
      "/api/groups",
      "/api/partners",
    ]);

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
  });

  const showMarketplace = Boolean(program?.addedToMarketplaceAt);
  const hasChanges = isDirty || autoApproval.pendingUpdates.length > 0;

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
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

      <div className="flex h-full flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        {showMarketplace && (
          <ToggleGroup
            className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
            optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm normal-case"
            indicatorClassName="bg-white"
            options={[
              { value: "applications", label: "Applications" },
              { value: "marketplace", label: "Marketplace" },
            ]}
            selected={activeSection}
            selectAction={(value) => setActiveSection(value as Section)}
          />
        )}

        {(!showMarketplace || activeSection === "applications") && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Eligibility requirements (optional)
                </p>
                <p className="text-sm text-neutral-500">
                  Only eligible partners can apply.{" "}
                  <Link
                    href="https://dub.co/help/article/program-applications#eligibility-requirements"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 underline underline-offset-2"
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

            <ApplicationAutoApproval
              loading={groupsLoading}
              autoApproval={autoApproval}
            />
          </div>
        )}

        {showMarketplace && activeSection === "marketplace" && (
          <div className="space-y-5">
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

async function updateGroupAutoApproval({
  workspaceId,
  groupId,
  autoApprovePartners,
  applyToAllGroups,
}: AutoApprovalUpdate & { workspaceId: string }) {
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
    throw new Error(error?.message || "Failed to update auto-approve setting.");
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
