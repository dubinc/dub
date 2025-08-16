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
  Logo,
  Modal,
  Switch,
  useRouterStuff,
} from "@dub/ui";
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
        ? getQueryString(params)
        : "?" + new URLSearchParams(params);

      const response = await fetch(`/api/commissions/export${searchParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `Dub Commissions Export - ${new Date().toISOString()}.csv`;
      a.click();

      toast.success("Exported successfully");
      setShowExportCommissionsModal(false);
    } catch (error) {
      toast.error(error);
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportCommissionsModal}
      setShowModal={setShowExportCommissionsModal}
      className="max-w-lg"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <div className="flex flex-col space-y-1 text-center">
          <h3 className="text-lg font-medium">Export commissions</h3>
          <p className="text-sm text-neutral-500">
            Export this program's commissions to a CSV file
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

        <div className="border-t border-neutral-200" />

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
        <Button loading={isSubmitting} text="Export commissions" />
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
