import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { LinkProps } from "@/lib/types";
import {
  Button,
  InputSelect,
  InputSelectItemProps,
  LinkLogo,
  Modal,
} from "@dub/ui";
import {
  APP_NAME,
  DICEBEAR_AVATAR_URL,
  getApexDomain,
  isDubDomain,
  linkConstructor,
} from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

type TransferLinkModalProps = {
  showTransferLinkModal: boolean;
  setShowTransferLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
};

function TransferLinkModal(props: TransferLinkModalProps) {
  return (
    <Modal
      showModal={props.showTransferLinkModal}
      setShowModal={props.setShowTransferLinkModal}
      className="overflow-y-visible"
    >
      <TransferLinkModalInner {...props} />
    </Modal>
  );
}

function TransferLinkModalInner({
  setShowTransferLinkModal,
  props,
}: TransferLinkModalProps) {
  const { id } = useWorkspace();
  const { workspaces } = useWorkspaces();
  const [transferring, setTransferring] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<InputSelectItemProps | null>(null);

  const apexDomain = getApexDomain(props.url);
  const { key, domain } = props;

  const shortlink = useMemo(() => {
    return linkConstructor({
      key,
      domain,
      pretty: true,
    });
  }, [key, domain]);

  const transferLink = async (linkId: string, newWorkspaceId: string) => {
    return await fetch(`/api/links/${linkId}/transfer?workspaceId=${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newWorkspaceId }),
    }).then(async (res) => {
      if (res.ok) {
        mutatePrefix("/api/links");
        setShowTransferLinkModal(false);
        return true;
      } else {
        const error = await res.json();
        throw new Error(error.message);
      }
    });
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (selectedWorkspace) {
          setTransferring(true);
          toast.promise(transferLink(props.id, selectedWorkspace.id), {
            loading: "Transferring link...",
            success: "Successfully transferred link.",
            error: "Failed to transfer link.",
          });
        }
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">Transfer {shortlink}</h3>
        <p className="text-sm text-neutral-500">
          Transfer this link and its analytics to another {APP_NAME} workspace.
          Link tags will not be transferred.
        </p>
      </div>

      <div className="flex flex-col space-y-28 bg-neutral-50 px-4 py-8 text-left sm:space-y-3 sm:rounded-b-2xl sm:px-16">
        <InputSelect
          items={
            workspaces
              ? workspaces.map((workspace) => ({
                  id: workspace.id,
                  value: workspace.name,
                  image:
                    workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`,
                  disabled:
                    normalizeWorkspaceId(workspace.id) === props.projectId,
                  label:
                    normalizeWorkspaceId(workspace.id) === props.projectId
                      ? "Current"
                      : "",
                }))
              : []
          }
          selectedItem={selectedWorkspace}
          setSelectedItem={setSelectedWorkspace}
          inputAttrs={{
            placeholder: "Select a workspace",
          }}
        />
        <Button
          disabled={!selectedWorkspace || !isDubDomain(domain)}
          loading={transferring}
          text="Confirm transfer"
        />
      </div>
    </form>
  );
}

export function useTransferLinkModal({ props }: { props: LinkProps }) {
  const [showTransferLinkModal, setShowTransferLinkModal] = useState(false);

  const TransferLinkModalCallback = useCallback(() => {
    return props ? (
      <TransferLinkModal
        showTransferLinkModal={showTransferLinkModal}
        setShowTransferLinkModal={setShowTransferLinkModal}
        props={props}
      />
    ) : null;
  }, [showTransferLinkModal, setShowTransferLinkModal]);

  return useMemo(
    () => ({
      setShowTransferLinkModal,
      TransferLinkModal: TransferLinkModalCallback,
    }),
    [setShowTransferLinkModal, TransferLinkModalCallback],
  );
}
