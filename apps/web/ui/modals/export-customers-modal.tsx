"use client";

import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import {
  CUSTOMER_EXPORT_COLUMNS,
  CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "@/lib/customers/export/schema";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Checkbox, Logo, Modal, Switch, useRouterStuff } from "@dub/ui";
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

function ExportCustomersModal({
  showExportCustomersModal,
  setShowExportCustomersModal,
}: {
  showExportCustomersModal: boolean;
  setShowExportCustomersModal: Dispatch<SetStateAction<boolean>>;
}) {
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

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const lid = toast.loading("Exporting customers...");

    try {
      const params = {
        ...(data.columns.length
          ? { columns: data.columns.join(",") }
          : undefined),
      };

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const searchParams = data.useFilters
        ? getQueryString({ ...params, timezone })
        : "?" + new URLSearchParams({ ...params, timezone });

      const response = await fetch(`/api/customers/export${searchParams}`, {
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
      className="max-w-lg"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <div className="flex flex-col space-y-1 text-center">
          <h3 className="text-lg font-medium">Export customers</h3>
          <p className="text-sm text-neutral-500">
            Export this program&apos;s customers to a CSV file
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 bg-neutral-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-12"
      >
        <div>
          <p className="block text-sm font-medium text-neutral-700">Columns</p>
          <Controller
            name="columns"
            control={control}
            render={({ field }) => (
              <div className="xs:grid-cols-2 mt-2 grid grid-cols-1 gap-x-4 gap-y-2">
                {CUSTOMER_EXPORT_COLUMNS.map(({ id, label }) => (
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

        <div className="border-t border-neutral-200" />

        <Controller
          name="useFilters"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between gap-2">
              <span className="flex select-none items-center gap-2 text-sm font-medium text-neutral-600 group-hover:text-neutral-800">
                Apply current filters
              </span>
              <Switch checked={field.value} fn={field.onChange} />
            </div>
          )}
        />
        <Button loading={isSubmitting} text="Export customers" />
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
