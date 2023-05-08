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
import { LoadingDots } from "#/ui/icons";
import Modal from "@/components/shared/modal";
import { LinkProps } from "@/lib/types";
import { getApexDomain, getQueryString, linkConstructor } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";

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
      showModal={showDeleteLinkModal}
      setShowModal={setShowDeleteLinkModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Delete {shortlink}</h3>
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
              slug
                ? `/api/projects/${slug}/links/${props.key}?domain=${domain}`
                : `/api/links/${props.key}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ).then(async (res) => {
              setDeleting(false);
              if (res.status === 200) {
                mutate(
                  slug
                    ? `/api/projects/${slug}/links${getQueryString(router)}`
                    : `/api/links${getQueryString(router)}`,
                );
                mutate(
                  (key) =>
                    typeof key === "string" &&
                    key.startsWith(
                      slug
                        ? `/api/projects/${slug}/links/count`
                        : `/api/links/count`,
                    ),
                  undefined,
                  { revalidate: true },
                );
                setShowDeleteLinkModal(false);
              } else {
                const { error } = await res.json();
                toast.error(error);
              }
            });
          }}
          className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
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
                className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              />
            </div>
          </div>

          <button
            disabled={deleting}
            className={`${
              deleting
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
            } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
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
    [setShowDeleteLinkModal, DeleteLinkModalCallback],
  );
}
