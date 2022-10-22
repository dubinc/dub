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
}: {
  showArchiveLinkModal: boolean;
  setShowArchiveLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
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
      <div className="inline-block w-full sm:max-w-md overflow-hidden align-middle transition-all transform bg-white sm:border sm:border-gray-200 shadow-xl sm:rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${apexDomain}`}
            alt={apexDomain}
            className="w-10 h-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-lg">Archive {shortlink}</h3>
          <p className="text-sm text-gray-500 text-center">
            Archived links will still work - they just won't show up on your
            main dashboard.
          </p>
        </div>

        <div className="flex flex-col space-y-6 text-left bg-gray-50 sm:px-16 px-4 py-8">
          <button
            onClick={async (e) => {
              e.preventDefault();
              setArchiving(true);
              fetch(
                domain
                  ? `/api/projects/${slug}/domains/${domain}/links/${props.key}/archive`
                  : `/api/links/${props.key}/archive`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              ).then(async (res) => {
                setArchiving(false);
                console.log(res.status, "mutating");
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
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-black hover:bg-white hover:text-black border-black text-white"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {archiving ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Confirm archive</p>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function useArchiveLinkModal({ props }: { props?: LinkProps }) {
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
