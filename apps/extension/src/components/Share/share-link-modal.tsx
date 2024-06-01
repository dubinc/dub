import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Send,
  Twitter,
  X,
} from "lucide-react";
import { PinterestIcon, RedditIcon, WhatsappIcon } from "../../../public";
import React, { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";


function ShareLinkModal({ showShareLinkModal, setShowShareLinkModal, prop } :{
  showShareLinkModal:boolean,
  setShowShareLinkModal:Dispatch<SetStateAction<boolean>>;
  prop:string
}){

  if (!showShareLinkModal) return null;

  const shareToPlatform = (platform: string) => {
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(prop)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(prop)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(prop)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=Check out this link&body=${encodeURIComponent(prop)}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(prop)}`;
        break;
      case "reddit":
        shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(prop)}`;
        break;
      case "pinterest":
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(prop)}`;
        break;
      case "instagram":
        shareUrl = `https://www.instagram.com/?url=${encodeURIComponent(prop)}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(prop)}`;
        break;
      default:
        break;
    }

    window.open(shareUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black bg-opacity-50"
      onClick={()=>setShowShareLinkModal(false)}
    >
      <div
        className="rounded-lg bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 flex justify-between text-lg font-bold">
          Share
          <button
            className="cursor-pointer text-sm transition-all duration-75 hover:scale-110"
            onClick={()=>setShowShareLinkModal(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </h2>
        <div className="grid grid-cols-5 gap-5">
          <button
            className="rounded-full bg-gray-600 p-2 text-white hover:bg-gray-700"
            onClick={() => shareToPlatform("email")}
          >
            <Mail className="h-7 w-7" />
          </button>
          <button
            className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700"
            onClick={() => shareToPlatform("facebook")}
          >
            <Facebook className="h-7 w-7" />
          </button>
          <button
            className="rounded-full bg-blue-400 p-2 text-white hover:bg-blue-500"
            onClick={() => shareToPlatform("twitter")}
          >
            <Twitter className="h-7 w-7" />
          </button>
          <button
            className="rounded-full bg-blue-700 p-2 text-white hover:bg-blue-800"
            onClick={() => shareToPlatform("linkedin")}
          >
            <Linkedin className="h-7 w-7" />
          </button>
          <button
            className="rounded-full bg-green-500 p-2 text-white hover:bg-green-600"
            onClick={() => shareToPlatform("whatsapp")}
          >
          <WhatsappIcon />
          </button>
          <button
            className="rounded-full bg-orange-600 p-2 text-white hover:bg-orange-700"
            onClick={() => shareToPlatform("reddit")}
          >
           <RedditIcon />
          </button>
          <button
            className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
            onClick={() => shareToPlatform("pinterest")}
          >
            <PinterestIcon />

          </button>
          <button
            className="rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 p-2 text-white hover:from-pink-600 hover:to-yellow-600"
            onClick={() => shareToPlatform("instagram")}
          >
            <Instagram className="h-7 w-7" />
          </button>
          <button
            className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600"
            onClick={() => shareToPlatform("telegram")}
          >
            <Send className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export function useShareLinkModal({ prop }: { prop: string }) {
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);

  const ShareLinkModalCallback = useCallback(() => {
    return prop ? (
      <ShareLinkModal
        showShareLinkModal={showShareLinkModal}
        setShowShareLinkModal={setShowShareLinkModal}
        prop={prop}
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

