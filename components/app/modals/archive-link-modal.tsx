import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "@/components/shared/blur-image";
import LoadingDots from "@/components/shared/icons/loading-dots";
import Modal from "@/components/shared/modal";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";
import { getApexDomain, getQueryString, linkConstructor } from "@/lib/utils";

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
  const { project: { domain } = {} } = useProject();
  const apexDomain = getApexDomain(props.url);

  const shortlink = useMemo(() => {
    return linkConstructor({
      key: props.key,
      domain,
      pretty: true,
    });
  }, [props, domain]);

  return (
    <Modal
      showModal={showArchiveLinkModal}
      setShowModal={setShowArchiveLinkModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${apexDomain}`}
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
          <button
            onClick={async (e) => {
              e.preventDefault();
              setArchiving(true);
              fetch(
                domain
                  ? `/api/projects/${slug}/domains/${domain}/links/${props.key}/archive`
                  : `/api/links/${props.key}/archive`,
                {
                  method: archived ? "POST" : "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              ).then(async (res) => {
                setArchiving(false);
                if (res.status === 200) {
                  mutate(
                    domain
                      ? `/api/projects/${slug}/domains/${domain}/links${getQueryString(
                          router,
                        )}`
                      : `/api/links${getQueryString(router)}`,
                  );
                  setShowArchiveLinkModal(false);
                }
              });
            }}
            disabled={archiving}
            className={`${
              archiving
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-black bg-black text-white hover:bg-white hover:text-black"
            } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
          >
            {archiving ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Confirm {archived ? "archive" : "unarchive"}</p>
            )}
          </button>
        </div>
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
