"use client";

import Modal from "#/ui/modal";
import { useState } from "react";

export default function PlayButton({
  url,
  className,
  children,
}: {
  url: string;
  className: string;
  children: React.ReactNode;
}) {
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
          className="aspect-[2300/1440] h-full w-full"
          src={url}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </Modal>
      <button onClick={() => setShowModal(true)} className={className}>
        {children}
      </button>
    </>
  );
}
