import { INTERVAL_DISPLAYS } from "@/lib/analytics/constants";
import { getIntervalData } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  exportLinksColumns,
  exportLinksColumnsDefault,
} from "@/lib/zod/schemas/links";
import {
  Button,
  Checkbox,
  DateRangePicker,
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

type FormData = {
  dateRange: {
    from?: Date;
    to?: Date;
    interval?: string;
  };
  columns: string[];
  useFilters: boolean;
};

function ExportLinksModal({
  showExportLinksModal,
  setShowExportLinksModal,
}: {
  showExportLinksModal: boolean;
  setShowExportLinksModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { data: session } = useSession();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const dateRangePickerId = useId();
  const columnCheckboxId = useId();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      dateRange: {
        interval: "all",
      },
      columns: exportLinksColumnsDefault,
      useFilters: true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const lid = toast.loading("Exporting links...");
    try {
      const params = {
        ...(workspaceId && { workspaceId }),
        ...(data.dateRange.from && data.dateRange.to
          ? {
              start: data.dateRange.from.toISOString(),
              end: data.dateRange.to.toISOString(),
            }
          : {
              interval: data.dateRange.interval ?? "all",
            }),
        columns: (data.columns.length
          ? data.columns
          : exportLinksColumnsDefault
        ).join(","),
      };

      const queryString = data.useFilters
        ? getQueryString(params, {
            exclude: ["import", "upgrade", "newLink"],
          })
        : "?" + new URLSearchParams(params).toString();

      const response = await fetch(`/api/links/export${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      if (response.status === 202) {
        toast.success(
          `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
        );
        setShowExportLinksModal(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dub Links Export - ${new Date().toISOString()}.csv`;
      a.click();

      toast.success("Exported successfully");
      setShowExportLinksModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error);
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportLinksModal}
      setShowModal={setShowExportLinksModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Export links</h3>
      </div>

      <form onSubmit={onSubmit}>
        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="mb-2 block text-sm font-medium text-neutral-700">
                Date Range
              </p>
              <Controller
                name="dateRange"
                control={control}
                render={({ field }) => (
                  <DateRangePicker
                    id={dateRangePickerId}
                    className="w-full"
                    value={
                      field.value?.from && field.value?.to
                        ? {
                            from: field.value.from,
                            to: field.value.to,
                          }
                        : undefined
                    }
                    presetId={
                      !field.value.from || !field.value.to
                        ? field.value.interval ?? "all"
                        : undefined
                    }
                    onChange={(dateRange, preset) => {
                      field.onChange(
                        preset ? { interval: preset.id } : dateRange,
                      );
                    }}
                    presets={INTERVAL_DISPLAYS.map(({ display, value }) => ({
                      id: value,
                      label: display,
                      dateRange: {
                        from: getIntervalData(value).startDate,
                        to: getIntervalData(value).endDate,
                      },
                    }))}
                  />
                )}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-neutral-700">
                Columns
              </p>
              <Controller
                name="columns"
                control={control}
                render={({ field }) => (
                  <div className="xs:grid-cols-2 grid grid-cols-1 gap-x-4 gap-y-2">
                    {exportLinksColumns.map(({ id, label }) => (
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
                  <InfoTooltip content="Filter exported links by your currently selected filters" />
                </span>
                <Switch checked={field.value} fn={field.onChange} />
              </div>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowExportLinksModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            type="button"
          />
          <Button
            type="submit"
            loading={isSubmitting}
            text="Export links"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useExportLinksModal() {
  const [showExportLinksModal, setShowExportLinksModal] = useState(false);

  const ExportLinksModalCallback = useCallback(() => {
    return (
      <ExportLinksModal
        showExportLinksModal={showExportLinksModal}
        setShowExportLinksModal={setShowExportLinksModal}
      />
    );
  }, [showExportLinksModal, setShowExportLinksModal]);

  return useMemo(
    () => ({
      setShowExportLinksModal,
      ExportLinksModal: ExportLinksModalCallback,
    }),
    [setShowExportLinksModal, ExportLinksModalCallback],
  );
}
