import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { DiscountCodeProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Tag } from "@dub/ui/icons";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface DeleteDiscountCodeModalProps {
  discountCode: DiscountCodeProps;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const DeleteDiscountCodeModal = ({
  discountCode,
  showModal,
  setShowModal,
}: DeleteDiscountCodeModalProps) => {
  const { isMobile } = useMediaQuery();
  const { makeRequest: deleteDiscountCode, isSubmitting } = useApiMutation();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await deleteDiscountCode(`/api/discount-codes/${discountCode.id}`, {
      method: "DELETE",
      onSuccess: async () => {
        toast.success(`Discount code deleted successfully!`);
        await mutatePrefix("/api/discount-codes");
        setShowModal(false);
      },
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="truncate text-lg font-medium">Delete discount code</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-4 px-4 py-6 text-left sm:px-6">
            <div className="text-content-default text-sm font-medium">
              <p>Are you sure you want to delete this discount code?</p>
            </div>

            <div className="relative flex h-7 w-fit items-center gap-1.5 rounded-lg bg-green-100 px-2 py-0">
              <Tag className="size-3 text-green-700" strokeWidth={1.5} />
              <div className="text-xs font-medium text-green-700">
                {discountCode.code}
              </div>
            </div>

            <p className="text-content-default text-sm font-normal">
              Deleting this code will remove it for the partner and they’ll no
              longer be able to use it – proceed with caution.
            </p>

            <div className="mt-6">
              <div className="flex items-center gap-2">
                <p className="text-content-emphasis block text-sm font-medium">
                  To verify, type{" "}
                  <span className="font-semibold">delete code</span> below
                </p>
              </div>

              <div className="mt-2">
                <div className="-m-1 rounded-[0.625rem] p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    aria-invalid="true"
                    autoFocus={!isMobile}
                    pattern="delete code"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
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
              text="Delete discount code"
              variant="danger"
              loading={isSubmitting}
              className="h-9 w-fit"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useDeleteDiscountCodeModal(discountCode: DiscountCodeProps) {
  const [showDeleteDiscountCodeModal, setShowDeleteDiscountCodeModal] =
    useState(false);

  const DeleteDiscountCodeModalCallback = useCallback(() => {
    return (
      <DeleteDiscountCodeModal
        showModal={showDeleteDiscountCodeModal}
        setShowModal={setShowDeleteDiscountCodeModal}
        discountCode={discountCode}
      />
    );
  }, [
    showDeleteDiscountCodeModal,
    setShowDeleteDiscountCodeModal,
    discountCode,
  ]);

  return useMemo(
    () => ({
      setShowDeleteDiscountCodeModal,
      DeleteDiscountCodeModal: DeleteDiscountCodeModalCallback,
    }),
    [setShowDeleteDiscountCodeModal, DeleteDiscountCodeModalCallback],
  );
}
