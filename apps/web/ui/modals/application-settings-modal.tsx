import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateApplicationSettingsAction } from "@/lib/actions/partners/update-application-settings";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ApplicationRequirementsDB } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { updateApplicationSettingsSchema } from "@/lib/zod/schemas/programs";
import {
  EligibilityCondition,
  EligibilityRequirements,
  generateId,
} from "@/ui/partners/eligibility-requirements";
import { Button, Modal, ToggleGroup, useEnterSubmit } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { ProgramCategorySelect } from "../partners/program-category-select";

type FormData = Omit<
  z.input<typeof updateApplicationSettingsSchema>,
  "workspaceId" | "eligibilityConditions"
> & {
  eligibilityConditions: EligibilityCondition[];
};

function ApplicationSettingsModal({
  showApplicationSettingsModal,
  setShowApplicationSettingsModal,
}: {
  showApplicationSettingsModal: boolean;
  setShowApplicationSettingsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { program } = useProgram();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [activeSection, setActiveSection] = useState<
    "applications" | "marketplace"
  >("applications");

  const {
    control,
    handleSubmit,
    setError,
    register,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: (() => {
      const applicationRequirements =
        (program?.applicationRequirements as ApplicationRequirementsDB | null) ??
        [];
      const selectedCondition =
        applicationRequirements.find(
          (condition) => condition.key === "identityVerification",
        ) ??
        applicationRequirements.find(
          (condition) => condition.key === "country",
        );

      return {
        description: program?.description ?? "",
        categories: program?.categories ?? [],
        eligibilityConditions: selectedCondition
          ? [{ ...selectedCondition, id: generateId() }]
          : [],
      };
    })(),
  });

  const { handleKeyDown } = useEnterSubmit();

  const { executeAsync } = useAction(updateApplicationSettingsAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success("Application settings updated");
      mutatePrefix(["/api/partners", "/api/programs"]);
      setShowApplicationSettingsModal(false);
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) return;

    const eligibilityConditions = data.eligibilityConditions
      ?.filter((c) => c.key && c.operator && c.value && c.value.length > 0)
      ?.map(({ key, operator, value }) => ({
        key: key!,
        operator: operator!,
        value: value!,
      }));

    const result = await executeAsync({
      ...data,
      workspaceId: workspaceId!,
      eligibilityConditions,
    });

    if (result?.serverError || result?.validationErrors) {
      setError("root.serverError", {
        message: "Failed to update application settings",
      });
      toast.error(
        parseActionError(result, "Failed to update application settings"),
      );
      return;
    }
  });

  return (
    <Modal
      showModal={showApplicationSettingsModal}
      setShowModal={setShowApplicationSettingsModal}
      className="flex max-h-[calc(100dvh-64px)] flex-col sm:max-h-[min(90dvh,720px)]"
    >
      <div className="shrink-0 space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Application settings
        </h3>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-hide flex-1 overflow-y-auto">
          <div
            className={cn(
              "space-y-6 bg-neutral-50 p-4 sm:p-6",
              program?.addedToMarketplaceAt && "pt-2 sm:pt-4",
            )}
          >
            {program?.addedToMarketplaceAt && (
              <ToggleGroup
                className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1"
                optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm normal-case"
                indicatorClassName="bg-white"
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
              <div className="space-y-5">
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900">
                      Eligibility requirements (optional)
                    </label>
                    <p className="text-sm text-neutral-500">
                      Only eligible partners can apply.{" "}
                      <Link
                        href="https://dub.co/help/article/partner-groups#eligibility-requirements"
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
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="block text-sm font-medium text-neutral-900">
                      Auto-approval settings
                    </p>
                    <p className="text-sm text-neutral-500">
                      The auto-approval setting is configurable at the group
                      level.
                    </p>
                  </div>

                  <a
                    href={`/${workspaceSlug}/program/groups/${DEFAULT_PARTNER_GROUP.slug}/settings`}
                    target="_blank"
                    className="block"
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      text="View default group settings ↗"
                      className="h-8 w-full px-3"
                    />
                  </a>
                </div>
              </div>
            )}

            {program?.addedToMarketplaceAt &&
              activeSection === "marketplace" && (
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
                        This description will be displayed in the program
                        marketplace.
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
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            buttonProps={{
                              className: cn(
                                errors.categories && "border-red-600",
                              ),
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowApplicationSettingsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isDirty}
            text="Save"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useApplicationSettingsModal() {
  const [showApplicationSettingsModal, setShowApplicationSettingsModal] =
    useState(false);

  const ApplicationSettingsModalCallback = useCallback(() => {
    return (
      <ApplicationSettingsModal
        showApplicationSettingsModal={showApplicationSettingsModal}
        setShowApplicationSettingsModal={setShowApplicationSettingsModal}
      />
    );
  }, [showApplicationSettingsModal, setShowApplicationSettingsModal]);

  return useMemo(
    () => ({
      setShowApplicationSettingsModal,
      ApplicationSettingsModal: ApplicationSettingsModalCallback,
    }),
    [setShowApplicationSettingsModal, ApplicationSettingsModalCallback],
  );
}
