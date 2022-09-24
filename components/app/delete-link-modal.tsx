import Modal from "@/components/shared/modal";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { useRouter } from "next/router";
import BlurImage from "@/components/shared/blur-image";
import LoadingDots from "@/components/shared/icons/loading-dots";
import { AlertCircleFill } from "@/components/shared/icons";
import { linkConstructor } from "@/lib/utils";
import { mutate } from "swr";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";

function DeleteLinkModal({
  showDeleteLinkModal,
  setShowDeleteLinkModal,
  props,
}: {
  showDeleteLinkModal: boolean;
  setShowDeleteLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const [deleting, setDeleting] = useState(false);
  const { project: { domain } = {} } = useProject();
  const urlHostname = props?.url ? new URL(props.url).hostname : null;

  const shortlink = useMemo(() => {
    return linkConstructor({
      key: props.key,
      domain,
      pretty: true,
    });
  }, [props, domain]);

  return (
    <Modal
      showModal={showDeleteLinkModal}
      setShowModal={setShowDeleteLinkModal}
    >
      <div className="inline-block w-full max-w-md overflow-hidden align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          <BlurImage
            src={`https://logo.clearbit.com/${urlHostname}`}
            alt={urlHostname}
            className="w-10 h-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-lg">Delete {shortlink}</h3>
          <p className="text-sm text-gray-500">
            Warning: Deleting this link will remove all of its stats. This
            action cannot be undone.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setDeleting(true);
            fetch(
              domain
                ? `/api/projects/${slug}/domains/${domain}/links/${props.key}`
                : `/api/links/${props.key}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            ).then(async (res) => {
              setDeleting(false);
              if (res.status === 200) {
                mutate(
                  domain
                    ? `/api/projects/${slug}/domains/${domain}/links`
                    : `/api/links`
                );
                setShowDeleteLinkModal(false);
              }
            });
          }}
          className="flex flex-col space-y-6 text-left bg-gray-50 sm:px-16 px-4 py-8"
        >
          <div>
            <label
              htmlFor="verification"
              className="block text-sm text-gray-700"
            >
              To verify, type <span className="font-semibold">{shortlink}</span>{" "}
              below
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="verification"
                id="verification"
                pattern={shortlink}
                required
                autoFocus={false}
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <button
            disabled={deleting}
            className={`${
              deleting
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-red-600 hover:bg-white hover:text-red-600 border-red-600 text-white"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {deleting ? <LoadingDots color="#808080" /> : <p>Confirm delete</p>}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export function useDeleteLinkModal({ props }: { props?: LinkProps }) {
  const [showDeleteLinkModal, setShowDeleteLinkModal] = useState(false);

  const DeleteLinkModalCallback = useCallback(() => {
    return props ? (
      <DeleteLinkModal
        showDeleteLinkModal={showDeleteLinkModal}
        setShowDeleteLinkModal={setShowDeleteLinkModal}
        props={props}
      />
    ) : null;
  }, [showDeleteLinkModal, setShowDeleteLinkModal]);

  return useMemo(
    () => ({
      setShowDeleteLinkModal,
      DeleteLinkModal: DeleteLinkModalCallback,
    }),
    [setShowDeleteLinkModal, DeleteLinkModalCallback]
  );
}
