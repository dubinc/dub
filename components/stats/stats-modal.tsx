import Modal from "@/components/shared/modal";
import { useState, Dispatch, SetStateAction } from "react";

const StatsModal = ({
  showStatsModal,
  setShowStatsModal,
}: {
  showStatsModal: boolean;
  setShowStatsModal: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <Modal showModal={showStatsModal} setShowModal={setShowStatsModal}>
      <div className="inline-block w-full max-w-screen-xl py-8 px-4 sm:px-16 overflow-hidden text-center align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="h-[calc(100vh-200px)]"></div>
      </div>
    </Modal>
  );
};

export default StatsModal;
