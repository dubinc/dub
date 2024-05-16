import React, { useEffect, useState } from "react";
import {
  ClickIcon,
  CopyIcon,
  DeleteIcon,
  DotIcon,
  EditIcon,
  ExpireIcon,
  QrIcon,
  ShareIcon,
} from "../../public";
import { LinkProps } from "./types";

const Link: React.FC<{ link: LinkProps | null }> = ({ link }) => {
  const [expired, setExpired] = useState<number | null>(null);

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
          console.log("Link copied to clipboard:", link.shortLink);
        })
        .catch((error) => {
          console.error("Failed to copy link to clipboard:", error);
        });
    }
  };

  const handleShare = () => {
    console.log("redat to share");
  };

  const handleShowQRCode = () => {
    console.log(`Showing QR code for link: ${link?.qrCode}`);
  };

  return (
    <div
      className="relative mb-4 mt-4 flex cursor-grab items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 shadow-lg transition-[border-color] hover:border-black active:cursor-grabbing"
      draggable={false}
      tabIndex={0}
      style={{ transform: "none", userSelect: "none", touchAction: "pan-y" }}
    >
      <span className=" absolute -right-2 -top-1.5 flex max-w-fit cursor-help items-center space-x-1 whitespace-nowrap rounded-full border border-gray-400 bg-gray-100 px-2 py-px text-xs font-medium capitalize text-gray-800 sm:-right-5">
        <ExpireIcon />
        {expired !== null && expired > 0 ? (
          <p>Expire In {expired} Min</p>
        ) : (
          <p>Expired</p>
        )}
      </span>
      <button className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 p-3 transition-all duration-75 hover:scale-105 hover:bg-red-500 active:scale-95 ">
        <DeleteIcon />
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
          https://www.example.com/{link?.url}
        </a>
      </div>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95"
        onClick={handleCopy}
      >
        <CopyIcon />
      </button>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={handleShowQRCode}
      >
        <QrIcon />
      </button>
      <button onClick={handleShare}>
        <ShareIcon />
      </button>
      <button
        onClick={handleShowQRCode}
        className="flex items-center justify-center gap-1 rounded-md bg-gray-100 p-1 text-gray-700 transition-all duration-75 hover:scale-105 active:scale-95"
      >
        <ClickIcon />
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
      <button onClick={() => console.log("edit")}>
        <EditIcon />
      </button>
    </div>
  );
};

export default Link;
