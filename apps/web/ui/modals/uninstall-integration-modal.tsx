import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import {
  BlurImage,
  Button,
  Logo,
  Modal,
  TokenAvatar,
  useMediaQuery,
} from "@dub/ui";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function UninstallIntegrationModal({
  showUninstallIntegrationModal,
  setShowUninstallIntegrationModal,
  integration,
}: {
  showUninstallIntegrationModal: boolean;
  setShowUninstallIntegrationModal: Dispatch<SetStateAction<boolean>>;
  integration: InstalledIntegrationInfoProps;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const { id: workspaceId, logo } = useWorkspace();
  const { name, description, installed } = integration;
  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showUninstallIntegrationModal}
      setShowModal={setShowUninstallIntegrationModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
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
        <h3 className="text-lg font-medium">Uninstall Integration</h3>
        <p className="text-center text-sm text-gray-500">
          This will remove the integration from your workspace. Are you sure you
          want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center space-x-3 rounded-md border border-gray-300 bg-white p-3">
          {integration.logo ? (
            <BlurImage
              src={integration.logo}
              alt={`Logo for ${integration.name}`}
              className="size-8 rounded-full border border-gray-200"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={integration.clientId} className="size-8" />
          )}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{name}</h3>
            <p className="line-clamp-1 text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <Button
          text="Confirm"
          variant="danger"
          autoFocus={!isMobile}
          loading={removing}
          onClick={() => {
            setRemoving(true);
            fetch(
              `/api/integrations/uninstall?workspaceId=${workspaceId}&installationId=${installed?.id}`,
              {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              },
            ).then(async (res) => {
              if (res.status === 200) {
                router.refresh();
                toast.success("Successfully removed integration!");
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

export function useUninstallIntegrationModal({
  integration,
}: {
  integration: InstalledIntegrationInfoProps;
}) {
  const [showUninstallIntegrationModal, setShowUninstallIntegrationModal] =
    useState(false);

  const UninstallIntegrationModalCallback = useCallback(() => {
    return (
      <UninstallIntegrationModal
        showUninstallIntegrationModal={showUninstallIntegrationModal}
        setShowUninstallIntegrationModal={setShowUninstallIntegrationModal}
        integration={integration}
      />
    );
  }, [showUninstallIntegrationModal, setShowUninstallIntegrationModal]);

  return useMemo(
    () => ({
      setShowUninstallIntegrationModal,
      UninstallIntegrationModal: UninstallIntegrationModalCallback,
    }),
    [setShowUninstallIntegrationModal, UninstallIntegrationModalCallback],
  );
}
