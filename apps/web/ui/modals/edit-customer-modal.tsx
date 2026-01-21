import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { CustomerEnriched, CustomerProps } from "@/lib/types";
import { updateCustomerBodySchema } from "@/lib/zod/schemas/customers";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type FormData = z.infer<typeof updateCustomerBodySchema>;

type EditCustomerModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  customer: Pick<
    CustomerEnriched,
    "id" | "name" | "email" | "stripeCustomerId" | "externalId"
  >;
};

function EditCustomerModal({
  showModal,
  setShowModal,
  customer,
}: EditCustomerModalProps) {
  const { isMobile } = useMediaQuery();
  const { makeRequest: updateCustomer, isSubmitting } =
    useApiMutation<CustomerProps>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: customer?.name || null,
      email: customer?.email || null,
      stripeCustomerId: customer?.stripeCustomerId || null,
      externalId: customer?.externalId || "",
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({
        name: customer?.name || null,
        email: customer?.email || null,
        stripeCustomerId: customer?.stripeCustomerId || null,
        externalId: customer?.externalId || "",
      });
    }
  }, [showModal, customer, reset]);

  const onSubmit = async (data: FormData) => {
    await updateCustomer(`/api/customers/${customer.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix("/api/customers");
        toast.success("Customer updated successfully!");
      },
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Edit customer</h3>
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
              <label className="text-content-emphasis text-sm font-normal">
                Name
              </label>
              <input
                type="text"
                autoComplete="off"
                className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="John Doe"
                autoFocus={!isMobile}
                {...register("name", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>

            <div>
              <label className="text-content-emphasis text-sm font-normal">
                Email
              </label>
              <input
                type="email"
                autoComplete="off"
                className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="marvin@email.com"
                {...register("email", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>

            <div>
              <label className="text-content-emphasis text-sm font-normal">
                External ID
              </label>
              <input
                type="text"
                autoComplete="off"
                className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="user_1K92AP652K2R7ANJAAHKENJNF"
                {...register("externalId", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>


            <div>
              <label className="text-content-emphasis text-sm font-normal">
                Stripe Customer ID
              </label>
              <input
                type="text"
                autoComplete="off"
                className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="cus_N1YwZ8JxQ2AbC9"
                {...register("stripeCustomerId", {
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
                text="Save"
                className="h-9 w-fit"
                loading={isSubmitting}
                disabled={!isDirty}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useEditCustomerModal() {
  const [customer, setCustomer] = useState<CustomerEnriched | null>(null);

  function openEditCustomerModal(customer: CustomerEnriched) {
    setCustomer(customer);
  }

  function closeEditCustomerModal() {
    setCustomer(null);
  }

  function EditCustomerModalWrapper() {
    if (!customer) return null;

    return (
      <EditCustomerModal
        customer={customer}
        showModal
        setShowModal={(show) => {
          if (!show) closeEditCustomerModal();
        }}
      />
    );
  }

  return {
    openEditCustomerModal,
    closeEditCustomerModal,
    EditCustomerModal: EditCustomerModalWrapper,
    isEditCustomerModalOpen: customer !== null,
  };
}
