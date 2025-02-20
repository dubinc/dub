import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { getPrettyUrl, pluralize } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { SimpleLinkCard } from "../links/simple-link-card";

type DeleteLinkModalProps = {
  showDeleteLinkModal: boolean;
  setShowDeleteLinkModal: Dispatch<SetStateAction<boolean>>;
  links: LinkProps[];
};

function DeleteLinkModal(props: DeleteLinkModalProps) {
  return (
    <Modal
      showModal={props.showDeleteLinkModal}
      setShowModal={props.setShowDeleteLinkModal}
    >
      <DeleteLinkModalInner {...props} />
    </Modal>
  );
}

function DeleteLinkModalInner({
  setShowDeleteLinkModal,
  links,
}: DeleteLinkModalProps) {
  const { id } = useWorkspace();
  const [deleting, setDeleting] = useState(false);

  const { isMobile } = useMediaQuery();

  const pattern =
    links.length > 1
      ? `delete ${links.length} links`
      : getPrettyUrl(links[0].shortLink);

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Delete {links.length > 1 ? `${links.length} links` : "link"}
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to delete the following{" "}
          {pluralize("link", links.length)}?
        </p>

        <p className="mt-4 text-sm font-medium text-neutral-800">
          Deleting these links will remove all of their analytics. This action
          cannot be undone – proceed with caution.
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          {links.map((link) => (
            <SimpleLinkCard key={link.id} link={link} />
          ))}
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setDeleting(true);
          fetch(
            `/api/links/bulk?workspaceId=${id}&linkIds=${links.map(({ id }) => id).join(",")}`,
            {
              method: "DELETE",
            },
          ).then(async (res) => {
            if (res.status === 200) {
              await mutatePrefix("/api/links");
              setShowDeleteLinkModal(false);
              toast.success(
                `Successfully deleted ${pluralize("link", links.length)}!`,
              );
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
            setDeleting(false);
          });
        }}
        className="flex flex-col bg-neutral-50 text-left"
      >
        <div className="px-4 sm:px-6">
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type <span className="font-semibold">{pattern}</span>{" "}
            below
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={pattern}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowDeleteLinkModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            variant="danger"
            text={`Delete ${pluralize("link", links.length)}`}
            loading={deleting}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useDeleteLinkModal({
  props,
}: {
  props?: LinkProps | LinkProps[];
}) {
  const [showDeleteLinkModal, setShowDeleteLinkModal] = useState(false);

  const DeleteLinkModalCallback = useCallback(() => {
    return props ? (
      <DeleteLinkModal
        showDeleteLinkModal={showDeleteLinkModal}
        setShowDeleteLinkModal={setShowDeleteLinkModal}
        links={Array.isArray(props) ? props : [props]}
      />
    ) : null;
  }, [showDeleteLinkModal, setShowDeleteLinkModal]);

  return useMemo(
    () => ({
      setShowDeleteLinkModal,
      DeleteLinkModal: DeleteLinkModalCallback,
    }),
    [setShowDeleteLinkModal, DeleteLinkModalCallback],
  );
}
