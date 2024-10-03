import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Button, LinkLogo, Modal, useToastWithUndo } from "@dub/ui";
import { getApexDomain, linkConstructor } from "@dub/utils";
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
  linkId,
  archive,
  workspaceId,
}: {
  linkId: string;
  archive: boolean;
  workspaceId?: string;
}) => {
  return fetch(`/api/links/${linkId}?workspaceId=${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: archive }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const revalidateLinks = () => {
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/links"),
    undefined,
    { revalidate: true },
  );
};

type ArchiveLinkModalProps = {
  showArchiveLinkModal: boolean;
  setShowArchiveLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
};

function ArchiveLinkModal(props: ArchiveLinkModalProps) {
  return (
    <Modal
      showModal={props.showArchiveLinkModal}
      setShowModal={props.setShowArchiveLinkModal}
    >
      <ArchiveLinkModalInner {...props} />
    </Modal>
  );
}

function ArchiveLinkModalInner({
  setShowArchiveLinkModal,
  props,
}: ArchiveLinkModalProps) {
  const toastWithUndo = useToastWithUndo();

  const { id: workspaceId } = useWorkspace();
  const [archiving, setArchiving] = useState(false);
  const apexDomain = getApexDomain(props.url);

  const { key, domain } = props;

  const shortlink = useMemo(() => {
    return linkConstructor({
      key,
      domain,
      pretty: true,
    });
  }, [key, domain]);

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const res = await sendArchiveRequest({
      linkId: props.id,
      archive: !props.archived,
      workspaceId,
    });
    setArchiving(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error.message);
      return;
    }

    revalidateLinks();
    setShowArchiveLinkModal(false);
    toastWithUndo({
      id: "link-archive-undo-toast",
      message: `Successfully ${props.archived ? "unarchived" : "archived"} link!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(
      sendArchiveRequest({
        linkId: props.id,
        archive: props.archived,
        workspaceId,
      }),
      {
        loading: "Undo in progress...",
        error: "Failed to roll back changes. An error occurred.",
        success: () => {
          revalidateLinks();
          return "Undo successful! Changes reverted.";
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">
          {props.archived ? "Unarchive" : "Archive"} {shortlink}
        </h3>
        <p className="text-sm text-gray-500">
          {props.archived
            ? "By unarchiving this link, it will show up on your main dashboard again."
            : "Archived links will still work - they just won't show up on your main dashboard."}
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
    </>
  );
}

export function useArchiveLinkModal({ props }: { props: LinkProps }) {
  const [showArchiveLinkModal, setShowArchiveLinkModal] = useState(false);

  const ArchiveLinkModalCallback = useCallback(() => {
    return props ? (
      <ArchiveLinkModal
        showArchiveLinkModal={showArchiveLinkModal}
        setShowArchiveLinkModal={setShowArchiveLinkModal}
        props={props}
      />
    ) : null;
  }, [showArchiveLinkModal, setShowArchiveLinkModal]);

  return useMemo(
    () => ({
      setShowArchiveLinkModal,
      ArchiveLinkModal: ArchiveLinkModalCallback,
    }),
    [setShowArchiveLinkModal, ArchiveLinkModalCallback],
  );
}
