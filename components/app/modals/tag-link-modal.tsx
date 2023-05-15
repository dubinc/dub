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
import Modal from "@/components/shared/modal";
import { LinkProps } from "@/lib/types";
import { getApexDomain, getQueryString, linkConstructor } from "@/lib/utils";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";
import { toast } from "sonner";
import Button from "#/ui/button";

function TagLinkModal({
  showTagLinkModal,
  setShowTagLinkModal,
  props,
}: {
  showTagLinkModal: boolean;
  setShowTagLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const [tagging, setTagging] = useState(false);
  const apexDomain = getApexDomain(props.url);

  const { key, domain, tagId } = props;

  const shortlink = useMemo(() => {
    return linkConstructor({
      key,
      domain,
      pretty: true,
    });
  }, [key, domain]);

  return (
    <Modal showModal={showTagLinkModal} setShowModal={setShowTagLinkModal}>
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Tag {shortlink}</h3>
          <p className="text-sm text-gray-500">
            Assign a tag to your short link
          </p>
        </div>

        <form
          className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
          onSubmit={async (e) => {
            e.preventDefault();
            setTagging(true);
            fetch(
              `/api/links/${encodeURIComponent(
                props.key,
              )}/tag?slug=${slug}&domain=${domain}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ).then(async (res) => {
              setTagging(false);
              if (res.status === 200) {
                mutate(`/api/links${getQueryString(router)}`);
                setShowTagLinkModal(false);
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
        >
          <Button loading={tagging} text="Confirm tag" />
        </form>
      </div>
    </Modal>
  );
}

export function useTagLinkModal({ props }: { props: LinkProps }) {
  const [showTagLinkModal, setShowTagLinkModal] = useState(false);

  const TagLinkModalCallback = useCallback(() => {
    return props ? (
      <TagLinkModal
        showTagLinkModal={showTagLinkModal}
        setShowTagLinkModal={setShowTagLinkModal}
        props={props}
      />
    ) : null;
  }, [showTagLinkModal, setShowTagLinkModal]);

  return useMemo(
    () => ({
      setShowTagLinkModal,
      TagLinkModal: TagLinkModalCallback,
    }),
    [setShowTagLinkModal, TagLinkModalCallback],
  );
}
