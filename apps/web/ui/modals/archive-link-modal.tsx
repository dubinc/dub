import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Button, Modal, useToastWithUndo } from "@dub/ui";
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
import LinkLogo from "../links/link-logo";

const sendArchiveRequest = (
  archived: boolean,
  id: string,
  workspaceId?: string,
) => {
  const baseUrl = `/api/links/${id}/archive`;
  return fetch(`${baseUrl}?workspaceId=${workspaceId}`, {
    method: archived ? "POST" : "DELETE",
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

function ArchiveLinkModal({
  showArchiveLinkModal,
  setShowArchiveLinkModal,
  props,
  archived,
}: {
  showArchiveLinkModal: boolean;
  setShowArchiveLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
  archived: boolean;
}) {
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
    const res = await sendArchiveRequest(archived, props.id, workspaceId);
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
      message: `Successfully ${archived ? "archived" : "unarchived"} link!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(sendArchiveRequest(!archived, props.id, workspaceId), {
      loading: "Undo in progress...",
      error: "Failed to roll back changes. An error occurred.",
      success: () => {
        revalidateLinks();
        return "Undo successful! Changes reverted.";
      },
    });
  };

  return (
    <Modal
      showModal={showArchiveLinkModal}
      setShowModal={setShowArchiveLinkModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">
          {archived ? "Archive" : "Unarchive"} {shortlink}
        </h3>
        <p className="text-sm text-gray-500">
          {archived
            ? "Archived links will still work - they just won't show up on your main dashboard."
            : "By unarchiving this link, it will show up on your main dashboard again."}
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={handleArchiveRequest}
          autoFocus
          loading={archiving}
          text={`Confirm ${archived ? "archive" : "unarchive"}`}
        />
      </div>
    </Modal>
  );
}

export function useArchiveLinkModal({
  props,
  archived = true,
}: {
  props: LinkProps;
  archived: boolean;
}) {
  const [showArchiveLinkModal, setShowArchiveLinkModal] = useState(false);

  const ArchiveLinkModalCallback = useCallback(() => {
    return props ? (
      <ArchiveLinkModal
        showArchiveLinkModal={showArchiveLinkModal}
        setShowArchiveLinkModal={setShowArchiveLinkModal}
        props={props}
        archived={archived}
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
