import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "#/ui/blur-image";
import Modal from "#/ui/modal";
import { type Link as LinkProps } from "@prisma/client";
import { getApexDomain, getQueryString, linkConstructor } from "#/lib/utils";
import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import { toast } from "sonner";
import Button from "#/ui/button";

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
  const router = useRouter();
  const { slug } = router.query;
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

  return (
    <Modal
      showModal={showArchiveLinkModal}
      setShowModal={setShowArchiveLinkModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <BlurImage
          src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
          alt={apexDomain}
          className="h-10 w-10 rounded-full"
          width={20}
          height={20}
        />
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
          onClick={async (e) => {
            e.preventDefault();
            setArchiving(true);
            fetch(
              `/api/links/${encodeURIComponent(props.key)}/archive${
                slug ? `?slug=${slug}&domain=${domain}` : ""
              }`,
              {
                method: archived ? "POST" : "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ).then(async (res) => {
              setArchiving(false);
              if (res.status === 200) {
                mutate(`/api/links${getQueryString(router)}`);
                mutate(
                  (key) =>
                    typeof key === "string" &&
                    key.startsWith(`/api/links/_count`),
                  undefined,
                  { revalidate: true },
                );
                setShowArchiveLinkModal(false);
                toast.success(
                  `Successfully ${archived ? "archived" : "unarchived"} link!`,
                );
              } else {
                toast.error(res.statusText);
              }
            });
          }}
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
