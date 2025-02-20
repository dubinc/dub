import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Button, CircleCheckFill, LinkLogo, Modal } from "@dub/ui";
import { cn, getApexDomain, getPrettyUrl, pluralize } from "@dub/utils";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface LinkConversionTrackingModalProps {
  showLinkConversionTrackingModal: boolean;
  setShowLinkConversionTrackingModal: Dispatch<SetStateAction<boolean>>;
  links: LinkProps[];
}

function LinkConversionTrackingModal(props: LinkConversionTrackingModalProps) {
  return (
    <Modal
      showModal={props.showLinkConversionTrackingModal}
      setShowModal={props.setShowLinkConversionTrackingModal}
    >
      <LinkConversionTrackingModalInner {...props} />
    </Modal>
  );
}

function LinkConversionTrackingModalInner({
  setShowLinkConversionTrackingModal,
  links,
}: LinkConversionTrackingModalProps) {
  const { id: workspaceId } = useWorkspace();
  const [updating, setUpdating] = useState(false);
  const [enableTracking, setEnableTracking] = useState(true);

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setUpdating(true);

    const response = await fetch(`/api/links/bulk?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        linkIds: links.map(({ id }) => id),
        data: { trackConversion: enableTracking },
      }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setUpdating(false);
      return;
    }

    mutatePrefix("/api/links");
    setShowLinkConversionTrackingModal(false);
    toast.success(
      `Successfully ${
        enableTracking ? "enabled" : "disabled"
      } conversion tracking for ${pluralize("link", links.length)}!`,
    );
    setUpdating(false);
  };

  // Number of links changed by adding conversion tracking
  const addChangeCount = links.filter(
    ({ trackConversion }) => !trackConversion,
  ).length;

  // Number of links changed by removing conversion tracking
  const removeChangeCount = links.length - addChangeCount;

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        {links.length === 1 && (
          <LinkLogo apexDomain={getApexDomain(links[0].url)} className="mb-4" />
        )}
        <h3 className="truncate text-lg font-medium leading-none">
          Edit conversion tracking for{" "}
          {links.length > 1
            ? `${links.length} links`
            : getPrettyUrl(links[0].shortLink)}
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          {[
            {
              value: "true",
              label: "Add conversion tracking",
              description: `${addChangeCount} ${pluralize(
                "link",
                addChangeCount,
              )} will be changed`,
            },
            {
              value: "false",
              label: "Remove conversion tracking",
              description: `${removeChangeCount} ${pluralize(
                "link",
                removeChangeCount,
              )} will be changed`,
            },
          ].map((option) => {
            const isSelected = enableTracking.toString() === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  className="hidden"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEnableTracking(option.value === "true");
                    }
                  }}
                />
                <div className="flex grow flex-col text-sm">
                  <span className="font-medium">{option.label}</span>
                  <span>{option.description}</span>
                </div>
                <CircleCheckFill
                  className={cn(
                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                    isSelected && "scale-100 opacity-100",
                  )}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowLinkConversionTrackingModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleSubmit}
          loading={updating}
          text={
            updating ? "Saving..." : `Save ${links.length > 1 ? "changes" : ""}`
          }
          className="h-8 w-fit px-3"
        />
      </div>
    </>
  );
}

export function useLinkConversionTrackingModal({
  props,
}: {
  props: LinkProps | LinkProps[];
}) {
  const [showLinkConversionTrackingModal, setShowLinkConversionTrackingModal] =
    useState(false);

  const LinkConversionTrackingModalCallback = useCallback(() => {
    return props ? (
      <LinkConversionTrackingModal
        showLinkConversionTrackingModal={showLinkConversionTrackingModal}
        setShowLinkConversionTrackingModal={setShowLinkConversionTrackingModal}
        links={Array.isArray(props) ? props : [props]}
      />
    ) : null;
  }, [
    showLinkConversionTrackingModal,
    setShowLinkConversionTrackingModal,
    props,
  ]);

  return useMemo(
    () => ({
      setShowLinkConversionTrackingModal,
      LinkConversionTrackingModal: LinkConversionTrackingModalCallback,
    }),
    [setShowLinkConversionTrackingModal, LinkConversionTrackingModalCallback],
  );
}
