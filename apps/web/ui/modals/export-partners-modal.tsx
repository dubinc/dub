import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  exportPartnerColumns,
  exportPartnersColumnsDefault,
} from "@/lib/zod/schemas/partners";
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

function ExportPartnersModal({
  showExportPartnersModal,
  setShowExportPartnersModal,
}: {
  showExportPartnersModal: boolean;
  setShowExportPartnersModal: Dispatch<SetStateAction<boolean>>;
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
      columns: exportPartnersColumnsDefault,
      useFilters: true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const lid = toast.loading("Exporting partners...");

    try {
      const params = {
        workspaceId,
        programId: program.id,
        ...(data.columns.length
          ? { columns: data.columns.join(",") }
          : undefined),
      };

      const searchParams = data.useFilters
        ? getQueryString(params)
        : "?" + new URLSearchParams(params);

      const response = await fetch(`/api/partners/export${searchParams}`, {
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
      a.download = `Dub Partners Export - ${new Date().toISOString()}.csv`;
      a.click();

      toast.success("Exported successfully");
      setShowExportPartnersModal(false);
    } catch (error) {
      toast.error(error);
    } finally {
      toast.dismiss(lid);
    }
  });

  return (
    <Modal
      showModal={showExportPartnersModal}
      setShowModal={setShowExportPartnersModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <div className="flex flex-col space-y-1 text-center">
          <h3 className="text-lg font-medium">Export partners</h3>
          <p className="text-sm text-neutral-500">
            Export this program's partners to a CSV file
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
                {exportPartnerColumns.map(({ id, label }) => (
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
                <InfoTooltip content="Filter exported partners by your currently selected filters" />
              </span>
              <Switch checked={field.value} fn={field.onChange} />
            </div>
          )}
        />
        <Button loading={isSubmitting} text="Export partners" />
      </form>
    </Modal>
  );
}

export function useExportPartnersModal() {
  const [showExportPartnersModal, setShowExportPartnersModal] = useState(false);

  const ExportPartnersModalCallback = useCallback(() => {
    return (
      <ExportPartnersModal
        showExportPartnersModal={showExportPartnersModal}
        setShowExportPartnersModal={setShowExportPartnersModal}
      />
    );
  }, [showExportPartnersModal, setShowExportPartnersModal]);

  return useMemo(
    () => ({
      setShowExportPartnersModal,
      ExportPartnersModal: ExportPartnersModalCallback,
    }),
    [setShowExportPartnersModal, ExportPartnersModalCallback],
  );
}
