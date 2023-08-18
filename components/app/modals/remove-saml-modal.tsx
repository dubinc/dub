import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import BlurImage from "#/ui/blur-image";
import Modal from "#/ui/modal";
import useProject from "#/lib/swr/use-project";
import { toast } from "sonner";
import Button from "#/ui/button";
import { Logo } from "#/ui/icons";
import useSAML from "#/lib/swr/use-saml";
import { SAML_PROVIDERS } from "#/lib/constants";

function RemoveSAMLModal({
  showRemoveSAMLModal,
  setShowRemoveSAMLModal,
}: {
  showRemoveSAMLModal: boolean;
  setShowRemoveSAMLModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [removing, setRemoving] = useState(false);
  const { slug, logo } = useProject();
  const { saml, provider, mutate } = useSAML();

  return (
    <Modal
      showModal={showRemoveSAMLModal}
      setShowModal={setShowRemoveSAMLModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt="Project logo"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Remove SAML</h3>
        <p className="text-center text-sm text-gray-500">
          This will remove SAML from your project. Are you sure you want to
          continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center space-x-3 rounded-md border border-gray-300 bg-white p-3">
          <img
            src={SAML_PROVIDERS.find((p) => p.name === provider)!.logo}
            alt={provider + " logo"}
            className="h-8 w-8"
          />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{provider} SAML</h3>
            <p className="text-xs text-gray-500">
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

            fetch(`/api/projects/${slug}/saml?${params}`, {
              method: "DELETE",
            }).then(async (res) => {
              if (res.ok) {
                toast.success("SAML removed successfully");
                mutate();
                setRemoving(false);
                setShowRemoveSAMLModal(false);
              } else {
                const error = await res.text();
                toast.error(error);
                setRemoving(false);
              }
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
