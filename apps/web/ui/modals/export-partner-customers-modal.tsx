"use client";

import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  PARTNER_CUSTOMER_EXPORT_COLUMNS,
  PARTNER_CUSTOMER_EXPORT_DEFAULT_COLUMNS,
} from "@/lib/zod/schemas/partner-profile";
import {
  Button,
  Checkbox,
  InfoTooltip,
  Modal,
  Switch,
  useRouterStuff,
} from "@dub/ui";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
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

function ExportPartnerCustomersModal({
  showExportPartnerCustomersModal,
  setShowExportPartnerCustomersModal,
}: {
  showExportPartnerCustomersModal: boolean;
  setShowExportPartnerCustomersModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { data: session } = useSession();
  const { programEnrollment } = useProgramEnrollment();
  const { getQueryString } = useRouterStuff();

  const columnCheckboxId = useId();

  const ltvExcluded = CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS.includes(
    programEnrollment?.programId ?? "",
  );
  const sharingEnabled = Boolean(
    programEnrollment?.customerDataSharingEnabledAt,
  );

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      columns: PARTNER_CUSTOMER_EXPORT_DEFAULT_COLUMNS,
      useFilters: true,
    },
  });

  const visibleColumns = useMemo(() => {
    return PARTNER_CUSTOMER_EXPORT_COLUMNS.filter((col) => {
      if (col.id === "name" && !sharingEnabled) {
        return false;
      }
      if (col.id === "saleAmount" && ltvExcluded) {
        return false;
      }
      return true;
    }).sort((a, b) => a.order - b.order);
  }, [sharingEnabled, ltvExcluded]);

  const onSubmit = handleSubmit(async (data) => {
    if (!programSlug) {
      return;
    }

    const lid = toast.loading("Exporting customers...");

    try {
      const visibleIds = new Set<string>(visibleColumns.map((col) => col.id));
      const columns = data.columns.filter((column) => visibleIds.has(column));

      const baseParams: Record<string, string> = {
        ...(columns.length ? { columns: columns.join(",") } : {}),
      };

      const queryString = data.useFilters
        ? getQueryString(baseParams)
        : `?${new URLSearchParams(baseParams).toString()}`;

      const response = await fetch(
        `/api/partner-profile/programs/${programSlug}/customers/export${queryString}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Customer export failed");
      }

      if (response.status === 202) {
        toast.success(
          `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
        );
        setShowExportPartnerCustomersModal(false);
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
      setShowExportPartnerCustomersModal(false);
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
      showModal={showExportPartnerCustomersModal}
      setShowModal={setShowExportPartnerCustomersModal}
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
            onClick={() => setShowExportPartnerCustomersModal(false)}
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

export function useExportPartnerCustomersModal() {
  const [showExportPartnerCustomersModal, setShowExportPartnerCustomersModal] =
    useState(false);

  const ExportPartnerCustomersModalCallback = useCallback(() => {
    return (
      <ExportPartnerCustomersModal
        showExportPartnerCustomersModal={showExportPartnerCustomersModal}
        setShowExportPartnerCustomersModal={setShowExportPartnerCustomersModal}
      />
    );
  }, [showExportPartnerCustomersModal, setShowExportPartnerCustomersModal]);

  return useMemo(
    () => ({
      setShowExportPartnerCustomersModal,
      ExportPartnerCustomersModal: ExportPartnerCustomersModalCallback,
    }),
    [setShowExportPartnerCustomersModal, ExportPartnerCustomersModalCallback],
  );
}
