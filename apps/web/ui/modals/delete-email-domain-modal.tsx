import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { EmailDomainProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface DeleteEmailDomainModalProps {
  emailDomain: Pick<EmailDomainProps, "id" | "slug">;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onDelete?: () => void;
}

const DeleteEmailDomainModal = ({
  emailDomain,
  showModal,
  setShowModal,
  onDelete,
}: DeleteEmailDomainModalProps) => {
  const { isMobile } = useMediaQuery();
  const { makeRequest: deleteEmailDomain, isSubmitting } = useApiMutation();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await deleteEmailDomain(`/api/email-domains/${emailDomain.slug}`, {
      method: "DELETE",
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix("/api/email-domains");
        toast.success("Email domain deleted successfully!");
        onDelete?.();
      },
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="truncate text-lg font-medium">Delete email domain</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-4 px-4 py-6 text-left sm:px-6">
            <div className="text-sm font-normal text-neutral-800">
              <h4 className="mb-2">
                Deleting <strong>{emailDomain.slug}</strong> domain will do the
                following:
              </h4>

              <ul className="mt-0.5 list-outside list-disc space-y-1.5 pl-4">
                <li>
                  All DNS records associated with this domain will be removed.
                </li>
                <li>
                  You will no longer be able to send emails from this domain.
                </li>
                <li>
                  Any marketing campaigns configured to use this domain will
                  need to be updated.
                </li>
              </ul>

              <p className="mt-4">
                This action cannot be undone – proceed with caution.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="block text-sm text-neutral-500">
                  To verify, type{" "}
                  <span className="font-medium text-neutral-700">
                    confirm delete {emailDomain.slug}
                  </span>{" "}
                  below
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
                    pattern={`confirm delete ${emailDomain.slug}`}
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
              text="Delete email domain"
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

export function useDeleteEmailDomainModal(
  emailDomain: Pick<EmailDomainProps, "id" | "slug">,
  onDelete?: () => void,
) {
  const [showDeleteEmailDomainModal, setShowDeleteEmailDomainModal] =
    useState(false);

  const DeleteEmailDomainModalCallback = useCallback(() => {
    return (
      <DeleteEmailDomainModal
        showModal={showDeleteEmailDomainModal}
        setShowModal={setShowDeleteEmailDomainModal}
        emailDomain={emailDomain}
        onDelete={onDelete}
      />
    );
  }, [
    showDeleteEmailDomainModal,
    setShowDeleteEmailDomainModal,
    onDelete,
    emailDomain,
  ]);

  return useMemo(
    () => ({
      setShowDeleteEmailDomainModal,
      DeleteEmailDomainModal: DeleteEmailDomainModalCallback,
    }),
    [setShowDeleteEmailDomainModal, DeleteEmailDomainModalCallback],
  );
}
