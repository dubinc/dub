import { getApexDomain, linkConstructor } from "@dub/utils";
import { Link2 } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Button, CopyButton, LinkLogo, Modal } from "..";
import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  PinterestIcon,
  RedditIcon,
  TelegramIcon,
  TwitterIcon,
  WhatsappIcon,
} from "../../public";
import IconMenu from "../../public/IconMenu";
import { LinkProps } from "../../src/types";
import Input from "../input";

function ShareLinkModal({
  showShareLinkModal,
  setShowShareLinkModal,
  props,
}: {
  showShareLinkModal: boolean;
  setShowShareLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  if (!showShareLinkModal) return null;

  const apexDomain = props ? getApexDomain(props.url) : null;
  let url = linkConstructor({
    domain: props.domain,
    key: props.key,
  });

  const shareToPlatform = (platform: string) => {
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=Check out this link&body=${encodeURIComponent(url)}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`;
        break;
      case "reddit":
        shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}`;
        break;
      case "pinterest":
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`;
        break;
      case "instagram":
        shareUrl = `https://www.instagram.com/?url=${encodeURIComponent(url)}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
        break;
      default:
        break;
    }

    window.open(shareUrl, "_blank");
  };

  return (
    <Modal onClose={() => setShowShareLinkModal(false)}>
      <div className="flex flex-col items-center justify-center rounded-lg  border-gray-200 bg-white py-8 text-black sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="mt-2 text-lg font-medium">Share This Link Via</h3>
        <div className="mb-7 mt-7 grid grid-cols-3 gap-5">
          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("email")}
            icon={<EmailIcon className="h-9 w-9" />}
          />
          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("facebook")}
            icon={<FacebookIcon className="h-7 w-7" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("twitter")}
            icon={<TwitterIcon className="h-7 w-7" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("linkedin")}
            icon={<LinkedinIcon className="h-7 w-7" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("whatsapp")}
            icon={<WhatsappIcon className="h-8 w-8" />}
            title="Whatsapp"
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("reddit")}
            icon={<RedditIcon className="h-7 w-7" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("pinterest")}
            icon={<PinterestIcon className="h-7 w-7" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("instagram")}
            icon={<InstagramIcon className="h-6 w-6" />}
          />

          <Button
            className="rounded-full border-none bg-gray-100 p-2 text-black hover:bg-gray-200"
            onClick={() => shareToPlatform("telegram")}
            icon={<TelegramIcon className="h-12 w-12" />}
          />
        </div>
        <div className="relative flex w-full justify-center">
          <IconMenu
            icon={
              <Link2
                className={
                  "absolute inset-y-0 left-0 my-2 ml-3 h-5 w-5 text-gray-400"
                }
              />
            }
          />
          <Input
            name="Copy URL"
            required
            placeholder="Something went Wrong"
            value={url}
            autoComplete="off"
            aria-invalid="true"
            className="h-auto w-full px-10 focus:border-gray-300"
          />
          <CopyButton
            value={url}
            className="absolute inset-y-0 right-2 m-1 flex items-center bg-white p-1 text-sm hover:bg-gray-100"
          />
        </div>
      </div>
    </Modal>
  );
}

export function useShareLinkModal({ props }: { props: LinkProps }) {
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);

  const ShareLinkModalCallback = useCallback(() => {
    return props ? (
      <ShareLinkModal
        showShareLinkModal={showShareLinkModal}
        setShowShareLinkModal={setShowShareLinkModal}
        props={props}
      />
    ) : null;
  }, [showShareLinkModal, setShowShareLinkModal]);

  return useMemo(
    () => ({
      setShowShareLinkModal,
      ShareLinkModal: ShareLinkModalCallback,
    }),
    [setShowShareLinkModal, ShareLinkModalCallback],
  );
}
