import useSAML from "@/lib/swr/use-saml";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { SAML_PROVIDERS } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function RemoveSAMLModal({
  showRemoveSAMLModal,
  setShowRemoveSAMLModal,
}: {
  showRemoveSAMLModal: boolean;
  setShowRemoveSAMLModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [removing, setRemoving] = useState(false);
  const [verification, setVerification] = useState("");
  const { id } = useWorkspace();
  const { saml, provider, mutate } = useSAML();
  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.name.startsWith(provider!)),
    [provider],
  );

  const confirmationText = "confirm remove saml";
  const isVerified = verification === confirmationText;

  const { isMobile } = useMediaQuery();

  const removeSAML = async () => {
    setRemoving(true);
    if (!provider) {
      toast.error("No SAML connection found");
      setRemoving(false);
      return;
    }
    const { clientID, clientSecret } = saml.connections[0];
    const params = new URLSearchParams({
      clientID,
      clientSecret,
    });

    const res = await fetch(`/api/workspaces/${id}/saml?${params}`, {
      method: "DELETE",
    });
    setRemoving(false);
    if (res.ok) {
      await mutate();
      setShowRemoveSAMLModal(false);
      toast.success("SAML removed successfully");
    } else {
      const { error } = await res.json();
      toast.error(error.message);
    }
  };

  return (
    <Modal
      showModal={showRemoveSAMLModal}
      setShowModal={setShowRemoveSAMLModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Remove SAML</h3>
        <p className="text-sm text-neutral-500">
          This will remove SAML from your workspace.{" "}
          <strong className="font-semibold text-neutral-700">
            This action can't be undone
          </strong>{" "}
          – proceed with caution.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await removeSAML();
        }}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6"
      >
        <div className="relative flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-4">
          <img
            src={currentProvider!.logo}
            alt={currentProvider!.name + " logo"}
            className="h-5 w-5"
          />
          <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
            {currentProvider!.name} SAML
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
          text="Remove SAML"
          variant="danger"
          loading={removing}
          disabled={!isVerified}
        />
      </form>
    </Modal>
  );
}

export function useRemoveSAMLModal() {
  const [showRemoveSAMLModal, setShowRemoveSAMLModal] = useState(false);

  const RemoveSAMLModalCallback = useCallback(() => {
    return (
      <RemoveSAMLModal
        showRemoveSAMLModal={showRemoveSAMLModal}
        setShowRemoveSAMLModal={setShowRemoveSAMLModal}
      />
    );
  }, [showRemoveSAMLModal, setShowRemoveSAMLModal]);

  return useMemo(
    () => ({
      setShowRemoveSAMLModal,
      RemoveSAMLModal: RemoveSAMLModalCallback,
    }),
    [setShowRemoveSAMLModal, RemoveSAMLModalCallback],
  );
}
