import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, LinkLogo, Modal, useToastWithUndo } from "@dub/ui";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

const sendArchiveRequest = ({
  domain,
  archive,
  workspaceId,
}: {
  domain: string;
  archive: boolean;
  workspaceId?: string;
}) => {
  const baseUrl = `/api/domains/${domain}`;
  return fetch(`${baseUrl}?workspaceId=${workspaceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ archived: archive }),
  });
};

function ArchiveDomainModal({
  showArchiveDomainModal,
  setShowArchiveDomainModal,
  props,
}: {
  showArchiveDomainModal: boolean;
  setShowArchiveDomainModal: Dispatch<SetStateAction<boolean>>;
  props: DomainProps;
}) {
  const toastWithUndo = useToastWithUndo();

  const { id: workspaceId } = useWorkspace();
  const [archiving, setArchiving] = useState(false);
  const domain = props.slug;

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const res = await sendArchiveRequest({
      domain,
      archive: !props.archived,
      workspaceId,
    });

    if (!res.ok) {
      const { error } = await res.json();
      setArchiving(false);
      toast.error(error.message);
      return;
    }

    await mutate(
      (key) => typeof key === "string" && key.startsWith("/api/domains"),
      undefined,
      {
        revalidate: true,
      },
    );
    setShowArchiveDomainModal(false);
    toastWithUndo({
      id: "domain-archive-undo-toast",
      message: `Successfully ${props.archived ? "unarchived" : "archived"} domain!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(
      sendArchiveRequest({
        domain,
        archive: props.archived,
        workspaceId,
      }),
      {
        loading: "Undo in progress...",
        error: "Failed to roll back changes. An error occurred.",
        success: async () => {
          await mutate(
            (key) => typeof key === "string" && key.startsWith("/api/domains"),
            undefined,
            { revalidate: true },
          );
          return "Undo successful! Changes reverted.";
        },
      },
    );
  };

  return (
    <Modal
      showModal={showArchiveDomainModal}
      setShowModal={setShowArchiveDomainModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={domain} />
        <h3 className="text-lg font-medium">
          {props.archived ? "Unarchive" : "Archive"} {domain}
        </h3>
        <p className="text-sm text-gray-500">
          {props.archived
            ? "By unarchiving this domain, it will show up in the link builder. "
            : "Archiving a domain will hide it from the link builder. "}
          <a
            href="https://dub.co/help/article/archiving-domains"
            target="_blank"
            className="text-sm text-gray-500 underline"
          >
            Learn more
          </a>
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={handleArchiveRequest}
          autoFocus
          loading={archiving}
          text={`Confirm ${props.archived ? "unarchive" : "archive"}`}
        />
      </div>
    </Modal>
  );
}

export function useArchiveDomainModal({ props }: { props: DomainProps }) {
  const [showArchiveDomainModal, setShowArchiveDomainModal] = useState(false);

  const ArchiveDomainModalCallback = useCallback(() => {
    return props ? (
      <ArchiveDomainModal
        showArchiveDomainModal={showArchiveDomainModal}
        setShowArchiveDomainModal={setShowArchiveDomainModal}
        props={props}
      />
    ) : null;
  }, [showArchiveDomainModal, setShowArchiveDomainModal]);

  return useMemo(
    () => ({
      setShowArchiveDomainModal,
      ArchiveDomainModal: ArchiveDomainModalCallback,
    }),
    [setShowArchiveDomainModal, ArchiveDomainModalCallback],
  );
}
