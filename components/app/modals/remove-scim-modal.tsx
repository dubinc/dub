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
import useSCIM from "#/lib/swr/use-scim";
import { SAML_PROVIDERS } from "#/lib/constants";
import { SAMLProviderProps } from "#/lib/types";

function RemoveSCIMModal({
  showRemoveSCIMModal,
  setShowRemoveSCIMModal,
}: {
  showRemoveSCIMModal: boolean;
  setShowRemoveSCIMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [removing, setRemoving] = useState(false);
  const { slug, logo } = useProject();
  const { scim, provider, mutate } = useSCIM();

  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.scim === provider),
    [provider],
  ) as SAMLProviderProps;

  return (
    <Modal
      showModal={showRemoveSCIMModal}
      setShowModal={setShowRemoveSCIMModal}
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
        <h3 className="text-lg font-medium">Remove SCIM Directory</h3>
        <p className="text-center text-sm text-gray-500">
          This will remove the currently configured SCIM directory from your
          project. Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center space-x-3 rounded-md border border-gray-300 bg-white p-3">
          <img
            src={currentProvider.logo}
            alt={currentProvider.name + " logo"}
            className="h-8 w-8"
          />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{currentProvider.name} SCIM</h3>
            <p className="text-xs text-gray-500">
              {currentProvider.name} SCIM is configured
            </p>
          </div>
        </div>
        <Button
          text="Confirm remove"
          variant="danger"
          loading={removing}
          onClick={() => {
            setRemoving(true);
            if (!scim?.directories[0]) {
              toast.error("No SCIM directories found");
              return;
            }
            const { id } = scim.directories[0];
            const params = new URLSearchParams({
              directoryId: id,
            });

            fetch(`/api/projects/${slug}/scim?${params}`, {
              method: "DELETE",
            }).then(async (res) => {
              if (res.ok) {
                toast.success("SCIM directory removed successfully");
                mutate();
                setRemoving(false);
                setShowRemoveSCIMModal(false);
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
