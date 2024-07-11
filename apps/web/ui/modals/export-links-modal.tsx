import { INTERVAL_DATA, INTERVAL_DISPLAYS } from "@/lib/analytics/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  Checkbox,
  DateRangePicker,
  Logo,
  Modal,
  useMediaQuery,
} from "@dub/ui";
import va from "@vercel/analytics";
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

const columns = [
  { id: "link", label: "Short link" },
  { id: "url", label: "Destination URL" },
  { id: "clicks", label: "Clicks" },
  { id: "createdAt", label: "Created at" },
  { id: "updatedAt", label: "Updated at" },
  { id: "tags", label: "Tags" },
  { id: "archived", label: "Archived" },
];

const defaultColumns = ["link", "url", "clicks", "createdAt"];

type FormData = {
  columns: string[];
  dateRange: {
    from?: Date;
    to?: Date;
    interval?: string;
  };
};

function ExportLinksModal({
  showExportLinksModal,
  setShowExportLinksModal,
}: {
  showExportLinksModal: boolean;
  setShowExportLinksModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const dateRangePickerId = useId();
  const checkboxId = useId();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      columns: defaultColumns,
      dateRange: {
        interval: "all",
      },
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    const queryString = new URLSearchParams({
      ...(workspaceId && { workspaceId }),
      ...(data.dateRange.from && data.dateRange.to
        ? {
            from: data.dateRange.from.toISOString(),
            to: data.dateRange.to.toISOString(),
          }
        : {
            interval: data.dateRange.interval ?? "all",
          }),
      columns: (data.columns.length ? data.columns : defaultColumns).join(","),
    }).toString();
    fetch(`/api/links/export?${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (res.status === 200 || res.status === 201) {
          va.track("Exported links");
          toast.success("Links exported successfully");
          setShowExportLinksModal(false);
        } else {
          const { error } = await res.json();
          toast.error(error.message);
        }
      })
      // TODO: catch
      .finally(() => setLoading(false));
  });

  return (
    <Modal
      showModal={showExportLinksModal}
      setShowModal={setShowExportLinksModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <div className="flex flex-col space-y-1 text-center">
          <h3 className="text-lg font-medium">Export links</h3>
          <p className="text-sm text-gray-500">
            Export this workspace's links to a CSV file
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 bg-gray-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-16"
      >
        <Controller
          name="dateRange"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label
                htmlFor={dateRangePickerId}
                className="block text-sm font-medium text-gray-700"
              >
                Link creation
              </label>
              <DateRangePicker
                id={dateRangePickerId}
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
                onChange={(dateRange, preset) =>
                  field.onChange(preset ? { interval: preset.id } : dateRange)
                }
                presets={INTERVAL_DISPLAYS.map(({ display, value }) => ({
                  id: value,
                  label: display,
                  dateRange: {
                    from: INTERVAL_DATA[value].startDate,
                    to: new Date(),
                  },
                }))}
              />
            </div>
          )}
        />

        <div>
          <p className="block text-sm font-medium text-gray-700">Columns</p>
          <Controller
            name="columns"
            control={control}
            render={({ field }) => (
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {columns.map(({ id, label }) => (
                  <div key={id} className="group flex gap-2">
                    <Checkbox
                      value={id}
                      id={`${checkboxId}-${id}`}
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
                      htmlFor={`${checkboxId}-${id}`}
                      className="select-none text-sm font-medium text-gray-600 group-hover:text-gray-800"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          />
        </div>
        <Button loading={loading} text="Export links" />
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
