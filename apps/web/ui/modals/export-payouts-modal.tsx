"use client";

import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  DEFAULT_PAYOUT_EXPORT_COLUMNS,
  PAYOUT_EXPORT_COLUMNS,
} from "@/lib/zod/schemas/payouts";
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

function ExportPayoutsModal({
  showExportPayoutsModal,
  setShowExportPayoutsModal,
}: {
  showExportPayoutsModal: boolean;
  setShowExportPayoutsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { data: session } = useSession();
  const columnCheckboxId = useId();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      columns: DEFAULT_PAYOUT_EXPORT_COLUMNS,
      useFilters: true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const lid = toast.loading("Exporting payouts...");

    try {
      const params = {
        workspaceId,
        ...(data.columns.length
          ? { columns: data.columns.join(",") }
          : undefined),
      };

      const queryString = data.useFilters
        ? getQueryString(params, {
            exclude: [
              "payoutId",
              "selectedPayoutId",
              "selectedPayoutIds",
              "excludedPayoutIds",
              "confirmPayouts",
              "page",
            ],
          })
        : `?${new URLSearchParams(params as Record<string, string>).toString()}`;

      const response = await fetch(`/api/payouts/export${queryString}`, {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Payout export failed");
      }

      if (response.status === 202) {
        toast.success(
          `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
        );
        setShowExportPayoutsModal(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateExportFilename("payouts");
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Payouts exported successfully");
      setShowExportPayoutsModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Payout export failed",
      );
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportPayoutsModal}
      setShowModal={setShowExportPayoutsModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Export payouts</h3>
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
                    {PAYOUT_EXPORT_COLUMNS.map(({ id, label }) => (
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
                  <InfoTooltip content="Filter exported payouts by your currently selected filters" />
                </span>
                <Switch checked={field.value} fn={field.onChange} />
              </div>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowExportPayoutsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            text="Export payouts"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useExportPayoutsModal() {
  const [showExportPayoutsModal, setShowExportPayoutsModal] = useState(false);

  const ExportPayoutsModalCallback = useCallback(() => {
    return (
      <ExportPayoutsModal
        showExportPayoutsModal={showExportPayoutsModal}
        setShowExportPayoutsModal={setShowExportPayoutsModal}
      />
    );
  }, [showExportPayoutsModal, setShowExportPayoutsModal]);

  return useMemo(
    () => ({
      setShowExportPayoutsModal,
      ExportPayoutsModal: ExportPayoutsModalCallback,
    }),
    [setShowExportPayoutsModal, ExportPayoutsModalCallback],
  );
}
