import useSCIM from "@/lib/swr/use-scim";
import useWorkspace from "@/lib/swr/use-workspace";
import { SAMLProviderProps } from "@/lib/types";
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

function RemoveSCIMModal({
  showRemoveSCIMModal,
  setShowRemoveSCIMModal,
}: {
  showRemoveSCIMModal: boolean;
  setShowRemoveSCIMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [removing, setRemoving] = useState(false);
  const [verification, setVerification] = useState("");
  const { id: workspaceId } = useWorkspace();
  const { scim, provider, mutate } = useSCIM();

  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.scim === provider),
    [provider],
  ) as SAMLProviderProps;

  const confirmationText = "confirm remove scim";
  const isVerified = verification === confirmationText;

  const { isMobile } = useMediaQuery();

  const removeSCIM = async () => {
    setRemoving(true);
    if (!scim?.directories[0]) {
      toast.error("No SCIM directories found");
      setRemoving(false);
      return;
    }
    const { id } = scim.directories[0];
    const params = new URLSearchParams({
      directoryId: id,
    });

    const res = await fetch(`/api/workspaces/${workspaceId}/scim?${params}`, {
      method: "DELETE",
    });
    setRemoving(false);
    if (res.ok) {
      await mutate();
      setShowRemoveSCIMModal(false);
      toast.success("SCIM directory removed successfully");
    } else {
      const { error } = await res.json();
      toast.error(error.message);
    }
  };

  return (
    <Modal
      showModal={showRemoveSCIMModal}
      setShowModal={setShowRemoveSCIMModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Remove SCIM Directory</h3>
        <p className="text-sm text-neutral-500">
          This will remove the currently configured SCIM directory from your
          workspace.{" "}
          <strong className="font-semibold text-neutral-700">
            This action can't be undone
          </strong>{" "}
          – proceed with caution.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await removeSCIM();
        }}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6"
      >
        <div className="relative flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-4">
          <img
            src={currentProvider.logo}
            alt={currentProvider.name + " logo"}
            className="h-5 w-5"
          />
          <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
            {currentProvider.name} SCIM
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
          text="Remove SCIM Directory"
          variant="danger"
          loading={removing}
          disabled={!isVerified}
        />
      </form>
    </Modal>
  );
}

export function useRemoveSCIMModal() {
  const [showRemoveSCIMModal, setShowRemoveSCIMModal] = useState(false);

  const RemoveSCIMModalCallback = useCallback(() => {
    return (
      <RemoveSCIMModal
        showRemoveSCIMModal={showRemoveSCIMModal}
        setShowRemoveSCIMModal={setShowRemoveSCIMModal}
      />
    );
  }, [showRemoveSCIMModal, setShowRemoveSCIMModal]);

  return useMemo(
    () => ({
      setShowRemoveSCIMModal,
      RemoveSCIMModal: RemoveSCIMModalCallback,
    }),
    [setShowRemoveSCIMModal, RemoveSCIMModalCallback],
  );
}
