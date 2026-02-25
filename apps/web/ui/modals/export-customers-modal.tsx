"use client";

import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CUSTOMER_EXPORT_COLUMNS,
  CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "@/lib/zod/schemas/customers";
import {
  Button,
  Checkbox,
  InfoTooltip,
  Modal,
  Switch,
  useRouterStuff,
} from "@dub/ui";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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

function ExportCustomersModal({
  showExportCustomersModal,
  setShowExportCustomersModal,
}: {
  showExportCustomersModal: boolean;
  setShowExportCustomersModal: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();

  const { program } = useProgram();
  const { data: session } = useSession();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const columnCheckboxId = useId();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      columns: CUSTOMER_EXPORT_DEFAULT_COLUMNS,
      useFilters: true,
    },
  });

  const scope = pathname.includes("/program") ? "program" : "workspace";

  const visibleColumns = useMemo(() => {
    const cols =
      scope === "program"
        ? [...CUSTOMER_EXPORT_COLUMNS]
        : CUSTOMER_EXPORT_COLUMNS.filter((col) => !col.programOnly);

    return cols.sort((a, b) => a.order - b.order);
  }, [scope]);

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) {
      return;
    }

    if (scope === "program" && !program?.id) {
      return;
    }

    const lid = toast.loading("Exporting customers...");

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const programOnlyIds = new Set<string>(
        CUSTOMER_EXPORT_COLUMNS.filter((col) => col.programOnly).map(
          (col) => col.id,
        ),
      );

      const columns =
        scope === "program"
          ? data.columns
          : data.columns.filter((c) => !programOnlyIds.has(c));

      let baseParams: Record<string, string> = {
        timezone,
        workspaceId,
        ...(columns.length ? { columns: columns.join(",") } : {}),
      };

      if (scope === "program" && program?.id) {
        baseParams = {
          ...baseParams,
          programId: program?.id,
        };
      }

      const queryString = data.useFilters
        ? getQueryString(baseParams)
        : `?${new URLSearchParams(baseParams).toString()}`;

      const response = await fetch(`/api/customers/export${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Customer export failed");
      }

      if (response.status === 202) {
        toast.success(
          `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
        );
        setShowExportCustomersModal(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      a.download = generateExportFilename("customers");
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Customers exported successfully");
      setShowExportCustomersModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Customer export failed",
      );
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportCustomersModal}
      setShowModal={setShowExportCustomersModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Export customers</h3>
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
                    {visibleColumns.map(({ id, label }) => (
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
                  <InfoTooltip content="Filter exported customers by your currently selected filters" />
                </span>
                <Switch checked={field.value} fn={field.onChange} />
              </div>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowExportCustomersModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            text="Export customers"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useExportCustomersModal() {
  const [showExportCustomersModal, setShowExportCustomersModal] =
    useState(false);

  const ExportCustomersModalCallback = useCallback(() => {
    return (
      <ExportCustomersModal
        showExportCustomersModal={showExportCustomersModal}
        setShowExportCustomersModal={setShowExportCustomersModal}
      />
    );
  }, [showExportCustomersModal, setShowExportCustomersModal]);

  return useMemo(
    () => ({
      setShowExportCustomersModal,
      ExportCustomersModal: ExportCustomersModalCallback,
    }),
    [setShowExportCustomersModal, ExportCustomersModalCallback],
  );
}
