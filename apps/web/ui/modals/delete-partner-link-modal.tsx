import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { SimpleLinkCard } from "@/ui/links/simple-link-card";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { getPrettyUrl } from "@dub/utils";
import { useParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

type DeletePartnerLinkModalProps = {
  showDeletePartnerLinkModal: boolean;
  setShowDeletePartnerLinkModal: Dispatch<SetStateAction<boolean>>;
  link: PartnerProfileLinkProps;
  onSuccess?: () => void;
};

function DeletePartnerLinkModal(props: DeletePartnerLinkModalProps) {
  return (
    <Modal
      showModal={props.showDeletePartnerLinkModal}
      setShowModal={props.setShowDeletePartnerLinkModal}
    >
      <DeletePartnerLinkModalInner {...props} />
    </Modal>
  );
}

function DeletePartnerLinkModalInner({
  setShowDeletePartnerLinkModal,
  link,
  onSuccess,
}: DeletePartnerLinkModalProps) {
  const { programSlug } = useParams();
  const { programEnrollment } = useProgramEnrollment();
  const { isMobile } = useMediaQuery();
  const [deleting, setDeleting] = useState(false);

  const partnerLink = constructPartnerLink({
    group: programEnrollment?.group,
    link,
  });

  const pattern = getPrettyUrl(partnerLink);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!programEnrollment?.program.id) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/partner-profile/programs/${programEnrollment.program.id}/links/${link.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      await mutate(`/api/partner-profile/programs/${programSlug}/links`);
      setShowDeletePartnerLinkModal(false);
      onSuccess?.();
      toast.success("Link deleted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete link. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Delete link</h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to delete this link?
        </p>

        <p className="mt-4 text-sm font-medium text-neutral-800">
          Deleting this link will remove all of its analytics. This action
          cannot be undone – proceed with caution.
        </p>

        <div className="mt-4 rounded-2xl border border-neutral-200 p-2">
          <SimpleLinkCard
            link={{
              shortLink: partnerLink,
              url: link.url,
            }}
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
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
            onClick={() => setShowDeletePartnerLinkModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            variant="danger"
            text="Delete link"
            loading={deleting}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useDeletePartnerLinkModal({
  link,
  onSuccess,
}: {
  link?: PartnerProfileLinkProps;
  onSuccess?: () => void;
}) {
  const [showDeletePartnerLinkModal, setShowDeletePartnerLinkModal] =
    useState(false);

  const linkRef = useRef(link);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    linkRef.current = link;
    onSuccessRef.current = onSuccess;
  }, [link, onSuccess]);

  const DeletePartnerLinkModalCallback = useCallback(() => {
    return linkRef.current ? (
      <DeletePartnerLinkModal
        showDeletePartnerLinkModal={showDeletePartnerLinkModal}
        setShowDeletePartnerLinkModal={setShowDeletePartnerLinkModal}
        link={linkRef.current}
        onSuccess={onSuccessRef.current}
      />
    ) : null;
  }, [showDeletePartnerLinkModal, setShowDeletePartnerLinkModal]);

  return useMemo(
    () => ({
      setShowDeletePartnerLinkModal,
      DeletePartnerLinkModal: DeletePartnerLinkModalCallback,
    }),
    [setShowDeletePartnerLinkModal, DeletePartnerLinkModalCallback],
  );
}
