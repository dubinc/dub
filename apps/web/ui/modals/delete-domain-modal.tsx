import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, LinkLogo, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function DeleteDomainModal({
  showDeleteDomainModal,
  setShowDeleteDomainModal,
  props,
}: {
  showDeleteDomainModal: boolean;
  setShowDeleteDomainModal: Dispatch<SetStateAction<boolean>>;
  props: DomainProps;
}) {
  const { id } = useWorkspace();
  const [deleting, setDeleting] = useState(false);
  const domain = props.slug;

  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showDeleteDomainModal}
      setShowModal={setShowDeleteDomainModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={domain} />
        <h3 className="text-lg font-medium">Delete {domain}</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <p>
            Deleting this domain will delete all associated links as well as
            their anaytics, permanently.
          </p>
          {Boolean(props.registeredDomain) && (
            <p>The domain will also be provisioned back to Dub.</p>
          )}
          <p>
            <strong className="font-semibold text-gray-700">
              This action can't be undone
            </strong>{" "}
            – proceed with caution.
          </p>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setDeleting(true);
          fetch(`/api/domains/${domain}?workspaceId=${id}`, {
            method: "DELETE",
          }).then(async (res) => {
            if (res.status === 200) {
              await mutate(
                (key) =>
                  typeof key === "string" && key.startsWith("/api/domains"),
                undefined,
                { revalidate: true },
              );
              setShowDeleteDomainModal(false);
              toast.success("Successfully deleted domain!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
            setDeleting(false);
          });
        }}
        className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="verification" className="block text-sm text-gray-700">
            To verify, type{" "}
            <span className="font-semibold">confirm delete {domain}</span> below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={`confirm delete ${domain}`}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            />
          </div>
        </div>

        <Button variant="danger" text="Confirm delete" loading={deleting} />
      </form>
    </Modal>
  );
}

export function useDeleteDomainModal({ props }: { props?: DomainProps }) {
  const [showDeleteDomainModal, setShowDeleteDomainModal] = useState(false);

  const DeleteDomainModalCallback = useCallback(() => {
    return props ? (
      <DeleteDomainModal
        showDeleteDomainModal={showDeleteDomainModal}
        setShowDeleteDomainModal={setShowDeleteDomainModal}
        props={props}
      />
    ) : null;
  }, [showDeleteDomainModal, setShowDeleteDomainModal]);

  return useMemo(
    () => ({
      setShowDeleteDomainModal,
      DeleteDomainModal: DeleteDomainModalCallback,
    }),
    [setShowDeleteDomainModal, DeleteDomainModalCallback],
  );
}
