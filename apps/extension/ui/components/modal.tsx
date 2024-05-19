import React from "react";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, children }) => {
  if (!show) return null;

  return (
    <>
      <div
        className="fixed left-0 top-0 z-50 h-full w-full bg-black opacity-60"
        onClick={onClose}
      ></div>
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 transform">
        <div className="rounded-md p-4 ">{children}</div>
      </div>
    </>
  );
};

export default Modal;
