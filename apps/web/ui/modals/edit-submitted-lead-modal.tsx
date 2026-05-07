"use client";

import { updateSubmittedLeadAction } from "@/lib/submitted-leads/update-submitted-lead-action";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { SubmittedLeadFormDataField, SubmittedLeadProps } from "@/lib/types";
import { updateSubmittedLeadSchema } from "@/lib/zod/schemas/submitted-leads";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type EditSubmittedLeadFormData = Omit<
  z.infer<typeof updateSubmittedLeadSchema>,
  "workspaceId" | "leadId" | "formData"
> & {
  formData: Record<string, unknown>;
};

type EditSubmittedLeadModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  lead: SubmittedLeadProps;
};

function getInputTypeForField(
  fieldType: SubmittedLeadFormDataField["type"],
): string {
  if (fieldType === "number") return "number";
  if (fieldType === "phone") return "tel";
  if (fieldType === "date") return "date";
  return "text";
}

function convertFormDataArrayToObject(
  formData: SubmittedLeadFormDataField[] | null | undefined,
): Record<string, unknown> {
  if (!formData) return {};

  return formData.reduce((acc, field) => {
    acc[field.key] = field.value;
    return acc;
  }, {});
}

function EditSubmittedLeadModal({
  showModal,
  setShowModal,
  lead,
}: EditSubmittedLeadModalProps) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const customFormData = lead.formData ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<EditSubmittedLeadFormData>({
    defaultValues: {
      name: lead.name || "",
      email: lead.email || "",
      company: lead.company || "",
      formData: convertFormDataArrayToObject(customFormData),
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (showModal) {
      reset({
        name: lead.name || "",
        email: lead.email || "",
        company: lead.company || "",
        formData: convertFormDataArrayToObject(customFormData),
      });
    }
  }, [showModal, lead, reset, customFormData]);

  const { executeAsync, isPending } = useAction(updateSubmittedLeadAction, {
    onSuccess: async () => {
      setShowModal(false);
      await mutatePrefix(`/api/programs/${defaultProgramId}/submitted-leads`);
      toast.success("Lead updated successfully!");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update lead");
    },
  });

  const onSubmit = async (data: EditSubmittedLeadFormData) => {
    if (!workspaceId || !lead.id) {
      return;
    }

    const originalFormData = lead.formData ?? [];

    // Convert formData back to array format with preserved metadata
    const updatedFormData: SubmittedLeadFormDataField[] = originalFormData.map(
      (field) => ({
        ...field,
        value:
          field.key in data.formData ? data.formData[field.key] : field.value,
      }),
    );

    await executeAsync({
      workspaceId,
      leadId: lead.id,
      name: data.name,
      email: data.email,
      company: data.company,
      formData: updatedFormData.length > 0 ? updatedFormData : null,
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Edit lead</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="max-h-[40vh] overflow-y-auto">
            <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
              {/* Name field */}
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  autoFocus={!isMobile}
                  className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="Jim Stephenson"
                  {...register("name", {
                    setValueAs: (value) => (value === "" ? "" : value),
                  })}
                />
              </div>

              {/* Email field */}
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Work email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="jim@nike.com"
                  {...register("email", {
                    setValueAs: (value) => (value === "" ? "" : value),
                  })}
                />
              </div>

              {/* Company field */}
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Company
                </label>
                <input
                  type="text"
                  autoComplete="organization"
                  className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="Nike"
                  {...register("company", {
                    setValueAs: (value) => (value === "" ? "" : value),
                  })}
                />
              </div>

              {/* Custom form data fields */}
              {customFormData.map((field) => {
                const keyPath = `formData.${field.key}` as const;

                if (field.type === "textarea") {
                  return (
                    <div key={field.key}>
                      <label className="text-content-emphasis text-sm font-normal">
                        {field.label}
                      </label>
                      <textarea
                        className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                        placeholder={field.label}
                        rows={3}
                        {...register(keyPath, {
                          setValueAs: (value) => (value === "" ? null : value),
                        })}
                      />
                    </div>
                  );
                }

                if (field.type === "country") {
                  return (
                    <div key={field.key}>
                      <label className="text-content-emphasis text-sm font-normal">
                        {field.label}
                      </label>
                      <Controller
                        control={control}
                        name={keyPath}
                        render={({ field: formField }) => {
                          const country = Object.entries(COUNTRIES).find(
                            ([_, name]) => name === (formField.value as string),
                          )?.[0];

                          return (
                            <CountryCombobox
                              value={country || (formField.value as string)}
                              onChange={formField.onChange}
                              className="mt-2"
                            />
                          );
                        }}
                      />
                    </div>
                  );
                }

                // Default: text, number, phone, date, etc.
                return (
                  <div key={field.key}>
                    <label className="text-content-emphasis text-sm font-normal">
                      {field.label}
                    </label>
                    <input
                      type={getInputTypeForField(field.type)}
                      className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                      placeholder={field.label}
                      {...register(keyPath, {
                        setValueAs: (value) => {
                          if (value === "") return null;
                          if (field.type === "number") {
                            const num = Number(value);
                            return Number.isNaN(num) ? null : num;
                          }
                          return value;
                        },
                      })}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-8 w-fit"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              />
              <Button
                type="submit"
                text="Save"
                className="h-8 w-fit"
                loading={isPending}
                disabled={!isDirty}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useEditSubmittedLeadModal() {
  const [lead, setLead] = useState<SubmittedLeadProps | null>(null);

  function openEditSubmittedLeadModal(lead: SubmittedLeadProps) {
    setLead(lead);
  }

  function closeEditSubmittedLeadModal() {
    setLead(null);
  }

  function EditSubmittedLeadModalWrapper() {
    if (!lead) return null;

    return (
      <EditSubmittedLeadModal
        lead={lead}
        showModal
        setShowModal={(show) => {
          if (!show) closeEditSubmittedLeadModal();
        }}
      />
    );
  }

  return {
    openEditSubmittedLeadModal,
    closeEditSubmittedLeadModal,
    EditSubmittedLeadModal: EditSubmittedLeadModalWrapper,
    isEditSubmittedLeadModalOpen: lead !== null,
  };
}
