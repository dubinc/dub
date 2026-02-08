import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

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
  const [verification, setVerification] = useState("");
  const domain = props.slug;

  const confirmationText = "confirm delete domain";
  const isVerified = verification === confirmationText;

  const { isMobile } = useMediaQuery();

  const deleteDomain = async () => {
    setDeleting(true);
    const res = await fetch(`/api/domains/${domain}?workspaceId=${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (res.status === 200) {
      await mutatePrefix("/api/domains");
      setShowDeleteDomainModal(false);
      toast.success("Successfully deleted domain!");
    } else {
      const { error } = await res.json();
      toast.error(error.message);
    }
  };

  return (
    <Modal
      showModal={showDeleteDomainModal}
      setShowModal={setShowDeleteDomainModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Delete {domain}</h3>
        <p className="text-sm text-neutral-500">
          Deleting this domain will delete all associated links as well as their
          analytics, permanently.
          {Boolean(props.registeredDomain) &&
            " The domain will also be provisioned back to Dub."}{" "}
          <strong className="font-semibold text-neutral-700">
            This action can't be undone
          </strong>{" "}
          – proceed with caution.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await deleteDomain();
        }}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6"
      >
        <div className="relative flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-4">
          <Globe className="size-5 text-neutral-500" />

          <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
            {domain}
          </h3>
        </div>

        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">{confirmationText}</span> below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={confirmationText}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <Button
          text="Delete"
          variant="danger"
          loading={deleting}
          disabled={!isVerified}
        />
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
  }, [showDeleteDomainModal, props]);

  return useMemo(
    () => ({
      setShowDeleteDomainModal,
      DeleteDomainModal: DeleteDomainModalCallback,
    }),
    [setShowDeleteDomainModal, DeleteDomainModalCallback],
  );
}
