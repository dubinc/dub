import {
  Check,
  Copy,
  EllipsisVertical,
  QrCode,
  Share2,
  SignalHigh,
  TimerOff,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { DotIcon } from "../../public";
import IconMenu from "../../public/IconMenu";
import Modal from "../../ui/components/modal";
import { QRCodeDownload } from "./Qrcode/QrDownload";
import ShareModal from "./Share/ShareModal";
import { LinkProps } from "./types";

const Link: React.FC<{ link: LinkProps | null }> = ({ link }) => {
  const [expired, setExpired] = useState<number | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copy, setCopy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (link && link.createdAt) {
      const expirationTime =
        new Date(link.createdAt).getTime() + 30 * 60 * 1000;
      const intervalId = setInterval(() => {
        const remaining = Math.ceil((expirationTime - Date.now()) / 1000);
        setExpired(remaining > 0 ? Math.floor(remaining / 60) : 0);
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, [link?.createdAt]);

  const handleCopy = () => {
    if (link?.shortLink) {
      navigator.clipboard
        .writeText(link.shortLink)
        .then(() => {
          setCopy(true);
          setTimeout(() => {
            setCopy(false);
          }, 2000);
        })
        .catch((error) => {
          console.error("Failed to copy link to clipboard:", error);
        });
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShowQRCode = () => {
    setShowQRCode((prevState) => !prevState);
    console.log(`Showing QR code for link: ${link?.qrCode}`);
  };

  const handleDelete = () => {
    console.log("delete");
  };

  return (
    <div
      className="relative mb-4 mt-4 flex cursor-grab items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 text-gray-500 shadow-lg transition-[border-color] hover:border-black active:cursor-grabbing"
      draggable={false}
      tabIndex={0}
      style={{ transform: "none", userSelect: "none", touchAction: "pan-y" }}
    >
      <span className=" absolute -right-2 -top-1.5 flex max-w-fit cursor-help items-center space-x-1 whitespace-nowrap rounded-full border border-gray-400 bg-gray-100 px-2 py-px text-xs font-medium capitalize text-gray-800 sm:-right-5">
        <IconMenu icon={<TimerOff className="h-3 w-3" />} />
        {expired !== null && expired > 0 ? (
          <p>Expire In {expired} Min</p>
        ) : (
          <p>Expired</p>
        )}
      </span>
      <button
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-white transition-all duration-75 hover:scale-110 hover:bg-red-600 active:scale-95"
        onClick={handleDelete}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={link?.image ? link.image : "https://dub.co/_static/logo.svg"}
          alt="link"
          className="absolute h-12 w-12 transition-transform duration-300"
          style={{
            transform: isHovered ? "rotateY(180deg)" : "rotateY(0deg)",
            opacity: isHovered ? "0" : "1",
          }}
        />
        <IconMenu
          icon={<Trash2 className="h-5 w-5" />}
          style={{
            transform: isHovered ? "rotateY(180deg)" : "rotateY(0deg)",
            opacity: isHovered ? "1" : "0",
          }}
        />
      </button>

      <div className="flex w-20 flex-col">
        <a
          className="line-clamp-2 text-base font-semibold text-blue-700"
          href={link?.shortLink}
          target={link?.shortLink}
          rel="noreferrer"
        >
          example.com{link?.shortLink}
        </a>
        <a
          href={link?.url}
          target={link?.url}
          rel="noreferrer"
          className="line-clamp-2  text-xs text-gray-500 transition-all hover:text-gray-800 "
        >
          https://www.example.com {link?.url}
        </a>
      </div>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100  active:scale-95"
        onClick={handleCopy}
      >
        <IconMenu
          icon={
            copy ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-3 w-3 text-gray-800 hover:text-black" />
            )
          }
        />
      </button>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={handleShowQRCode}
      >
        <IconMenu icon={<QrCode className="h-4 w-4  hover:text-black" />} />
      </button>
      {showQRCode && (
        <Modal show={showQRCode} onClose={handleShowQRCode}>
          <QRCodeDownload
            // props={{ url: link?.url, key: link?.key }}
            props={{ url: "https://dub.co/api", key: "ssssssss" }}
          />
        </Modal>
      )}
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={handleShare}
      >
        <IconMenu icon={<Share2 className="h-4 w-4  hover:text-black" />} />
      </button>
      {showShareModal && (
        <ShareModal
          show={showShareModal}
          onClose={() => setShowShareModal(false)}
          link={link?.shortLink || ""}
        />
      )}
      <button
        onClick={handleShowQRCode}
        className="flex items-center justify-center gap-1 rounded-md bg-gray-100 p-1 text-gray-700 transition-all duration-75 hover:scale-105 active:scale-95"
      >
        <IconMenu icon={<SignalHigh className="h-4 w-4 hover:text-black" />} />
        {link?.clicks ? (
          <p className="text-sm">{link?.clicks}</p>
        ) : (
          <>
            <DotIcon />
            <p className="text-sm">
              <span className="ml-1 hidden sm:inline-block">clicks</span>
            </p>
          </>
        )}
      </button>
      <button
        className="group rounded-lg bg-gray-100 p-1 transition-all duration-75 hover:scale-110 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={() => console.log("edit")}
      >
        <IconMenu
          icon={<EllipsisVertical className="h-4 w-4 hover:text-black" />}
        />
      </button>
    </div>
  );
};

export default Link;
