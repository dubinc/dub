"use client";

import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  COMMISSION_EXPORT_COLUMNS,
  DEFAULT_COMMISSION_EXPORT_COLUMNS,
} from "@/lib/zod/schemas/commissions";
import {
  Button,
  Checkbox,
  InfoTooltip,
  Modal,
  Switch,
  useRouterStuff,
} from "@dub/ui";
import { useSession } from "next-auth/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface FormData {
  columns: string[];
  useFilters: boolean;
}

function ExportCommissionsModal({
  showExportCommissionsModal,
  setShowExportCommissionsModal,
}: {
  showExportCommissionsModal: boolean;
  setShowExportCommissionsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { data: session } = useSession();
  const columnCheckboxId = useId();
  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      columns: DEFAULT_COMMISSION_EXPORT_COLUMNS,
      useFilters: true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const lid = toast.loading("Exporting commissions...");

    try {
      const params = {
        workspaceId,
        ...(data.columns.length
          ? { columns: data.columns.join(",") }
          : undefined),
      };

      const searchParams = data.useFilters
        ? getQueryString({
            ...params,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : "?" +
          new URLSearchParams({
            ...params,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });

      const response = await fetch(`/api/commissions/export${searchParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Commission export failed");
      }

      if (response.status === 202) {
        toast.success(
          `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
        );
        setShowExportCommissionsModal(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateExportFilename("commissions");
      a.click();

      toast.success("Commissions exported successfully");
      setShowExportCommissionsModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Commission export failed",
      );
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportCommissionsModal}
      setShowModal={setShowExportCommissionsModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Export commissions</h3>
      </div>

      <form onSubmit={onSubmit}>
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="mb-2 block text-sm font-medium text-neutral-700">
                Columns
              </p>
              <Controller
                name="columns"
                control={control}
                render={({ field }) => (
                  <div className="xs:grid-cols-2 grid grid-cols-1 gap-x-4 gap-y-2">
                    {COMMISSION_EXPORT_COLUMNS.map(({ id, label }) => (
                      <div key={id} className="group flex gap-2">
                        <Checkbox
                          value={id}
                          id={`${columnCheckboxId}-${id}`}
                          checked={field.value.includes(id)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, id]
                                : field.value.filter((value) => value !== id),
                            );
                          }}
                        />
                        <label
                          htmlFor={`${columnCheckboxId}-${id}`}
                          className="select-none text-sm font-medium text-neutral-600 group-hover:text-neutral-800"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
          <Controller
            name="useFilters"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between gap-2">
                <span className="flex select-none items-center gap-2 text-sm font-medium text-neutral-600 group-hover:text-neutral-800">
                  Apply current filters
                  <InfoTooltip content="Filter exported commissions by your currently selected filters" />
                </span>
                <Switch checked={field.value} fn={field.onChange} />
              </div>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowExportCommissionsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            text="Export commissions"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useExportCommissionsModal() {
  const [showExportCommissionsModal, setShowExportCommissionsModal] =
    useState(false);

  const ExportCommissionsModalCallback = useCallback(() => {
    return (
      <ExportCommissionsModal
        showExportCommissionsModal={showExportCommissionsModal}
        setShowExportCommissionsModal={setShowExportCommissionsModal}
      />
    );
  }, [showExportCommissionsModal, setShowExportCommissionsModal]);

  return useMemo(
    () => ({
      setShowExportCommissionsModal,
      ExportCommissionsModal: ExportCommissionsModalCallback,
    }),
    [setShowExportCommissionsModal, ExportCommissionsModalCallback],
  );
}
