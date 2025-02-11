import useSAML from "@/lib/swr/use-saml";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, Button, Logo, Modal } from "@dub/ui";
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
  const { id, logo } = useWorkspace();
  const { saml, provider, mutate } = useSAML();

  return (
    <Modal
      showModal={showRemoveSAMLModal}
      setShowModal={setShowRemoveSAMLModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt="Workspace logo"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Remove SAML</h3>
        <p className="text-center text-sm text-neutral-500">
          This will remove SAML from your workspace. Are you sure you want to
          continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center space-x-3 rounded-md border border-neutral-300 bg-white p-3">
          <img
            src={SAML_PROVIDERS.find((p) => p.name === provider)!.logo}
            alt={provider + " logo"}
            className="h-8 w-8"
          />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{provider} SAML</h3>
            <p className="text-xs text-neutral-500">
              {provider} SAML is configured
            </p>
          </div>
        </div>
        <Button
          text="Confirm remove"
          variant="danger"
          loading={removing}
          onClick={() => {
            setRemoving(true);
            if (!provider) {
              toast.error("No SAML connection found");
              return;
            }
            const { clientID, clientSecret } = saml.connections[0];
            const params = new URLSearchParams({
              clientID,
              clientSecret,
            });

            fetch(`/api/workspaces/${id}/saml?${params}`, {
              method: "DELETE",
            }).then(async (res) => {
              if (res.ok) {
                await mutate();
                setShowRemoveSAMLModal(false);
                toast.success("SAML removed successfully");
              } else {
                const { error } = await res.json();
                toast.error(error.message);
              }
              setRemoving(false);
            });
          }}
        />
      </div>
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
