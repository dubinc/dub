import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps } from "@/lib/types";
import { createCustomerBodySchema } from "@/lib/zod/schemas/customers";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";

interface AddCustomerModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (customer: CustomerProps) => void;
}

type FormData = z.infer<typeof createCustomerBodySchema>;

const AddCustomerModal = ({
  showModal,
  setShowModal,
  onSuccess,
}: AddCustomerModalProps) => {
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: null,
      email: null,
      externalId: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(
        `/api/customers?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message || "Failed to create customer.");
      }

      const customer = await response.json();
      await mutate(`/api/customers?workspaceId=${workspaceId}`);
      toast.success(
        `Customer with ID "${customer.externalId}" added successfully!`,
      );
      onSuccess?.(customer);
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    }
  };

  const externalId = watch("externalId");

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Create new customer</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div>
              <label className="text-sm font-normal text-neutral-500">
                External ID (Required)
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="cus_GWGrkftJdYlZD2mq"
                autoFocus={!isMobile}
                {...register("externalId", { required: true })}
              />
              <p className="mt-2 text-xs text-neutral-500">
                The customer's unique ID in your database (can also be their
                email)
              </p>
            </div>

            <div>
              <label className="text-sm font-normal text-neutral-500">
                Name
              </label>
              <input
                type="text"
                autoComplete="off"
                className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="John Doe"
                {...register("name", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>

            <div>
              <label className="text-sm font-normal text-neutral-500">
                Email
              </label>
              <input
                type="email"
                autoComplete="off"
                className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="john@example.com"
                {...register("email", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text="Create customer"
                className="h-9 w-fit"
                loading={isSubmitting}
                disabled={!externalId}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useAddCustomerModal({
  onSuccess,
}: {
  onSuccess?: (customer: CustomerProps) => void;
} = {}) {
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const AddCustomerModalCallback = useCallback(() => {
    return (
      <AddCustomerModal
        showModal={showAddCustomerModal}
        setShowModal={setShowAddCustomerModal}
        onSuccess={onSuccess}
      />
    );
  }, [showAddCustomerModal, setShowAddCustomerModal]);

  return useMemo(
    () => ({
      setShowAddCustomerModal,
      AddCustomerModal: AddCustomerModalCallback,
    }),
    [setShowAddCustomerModal, AddCustomerModalCallback],
  );
}
