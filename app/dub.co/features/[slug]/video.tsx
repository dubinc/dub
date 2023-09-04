"use client";

import BlurImage from "#/ui/blur-image";
import Modal from "#/ui/modal";
import { Play } from "lucide-react";
import { useState } from "react";

export default function DemoVideo({ url }: { url: string }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <Modal
        className="max-w-screen-xl"
        dialogOnly
        showModal={showModal}
        setShowModal={setShowModal}
      >
        <iframe
          className="aspect-video h-full w-full"
          src={url}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </Modal>
      <button
        onClick={() => setShowModal(true)}
        className="group absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-black bg-opacity-0 transition-all duration-300 hover:bg-opacity-5 focus:outline-none"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-gradient-to-tr from-black to-gray-700 p-5 ring-[6px] ring-gray-300 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-active:scale-90">
            <Play className="h-5 w-5 text-white" fill="currentColor" />
          </div>
          <div className="flex rounded-full border border-gray-200 bg-white p-2 shadow-xl group-hover:shadow-2xl">
            <BlurImage
              src="https://d2vwwcvoksz7ty.cloudfront.net/author/steventey.jpg"
              alt="Steven Tey"
              width={36}
              height={36}
              className="h-10 w-10 rounded-full"
            />
            <div className="ml-2 mr-4 flex flex-col text-left">
              <p className="text-sm font-medium text-gray-500">Watch Demo</p>
              <p className="text-sm text-blue-500">2:30</p>
            </div>
          </div>
        </div>
      </button>
    </>
  );
}
