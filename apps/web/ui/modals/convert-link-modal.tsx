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

const sendConvertRequest = ({
  linkId,
  trackConversion,
  workspaceId,
}: {
  linkId: string;
  trackConversion: boolean;
  workspaceId?: string;
}) => {
  return fetch(`/api/links/${linkId}?workspaceId=${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify({ trackConversion }),
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

function ConvertLinkModal({
  showConvertLinkModal,
  setShowConvertLinkModal,
  props,
}: {
  showConvertLinkModal: boolean;
  setShowConvertLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
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

  const handleConvertRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const res = await sendConvertRequest({
      linkId: props.id,
      trackConversion: !props.trackConversion,
      workspaceId,
    });
    setArchiving(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error.message);
      return;
    }

    revalidateLinks();
    setShowConvertLinkModal(false);
    toastWithUndo({
      id: "undo-convert-link-toast",
      message: `Successfully ${props.trackConversion ? "disabled" : "enable"} conversion tracking for link!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(
      sendConvertRequest({
        linkId: props.id,
        trackConversion: props.trackConversion,
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
    <Modal
      showModal={showConvertLinkModal}
      setShowModal={setShowConvertLinkModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">
          {props.trackConversion ? "Disable" : "Enable"} Conversion Tracking
        </h3>
        <p className="text-sm text-gray-500">
          {props.trackConversion
            ? "By disabling conversion tracking, you will no longer be able to track link conversions."
            : "By enabling conversion tracking, you will be able to track link conversions."}
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={handleConvertRequest}
          autoFocus
          loading={archiving}
          text={`Confirm ${props.trackConversion ? "Disable" : "Enable"}`}
        />
      </div>
    </Modal>
  );
}

export function useConvertLinkModal({ props }: { props: LinkProps }) {
  const [showConvertLinkModal, setShowConvertLinkModal] = useState(false);

  const ConvertLinkModalCallback = useCallback(() => {
    return props ? (
      <ConvertLinkModal
        showConvertLinkModal={showConvertLinkModal}
        setShowConvertLinkModal={setShowConvertLinkModal}
        props={props}
      />
    ) : null;
  }, [showConvertLinkModal, setShowConvertLinkModal]);

  return useMemo(
    () => ({
      setShowConvertLinkModal,
      ConvertLinkModal: ConvertLinkModalCallback,
    }),
    [setShowConvertLinkModal, ConvertLinkModalCallback],
  );
}
