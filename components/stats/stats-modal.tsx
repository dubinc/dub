import Modal from "@/components/shared/modal";
import { Dispatch, SetStateAction } from "react";
import Stats from ".";
import { RawStatsProps } from "@/lib/stats";

export default function StatsModal({
  _key,
  stats,
  showStatsModal,
  setShowStatsModal,
}: {
  _key: string;
  stats: RawStatsProps[];
  showStatsModal: boolean;
  setShowStatsModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal showModal={showStatsModal} setShowModal={setShowStatsModal}>
      <div className="inline-block w-full max-w-screen-xl max-h-[calc(100vh-100px)] py-8 px-4 sm:px-16 overflow-scroll text-center align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <Stats _key={_key} stats={stats} />
      </div>
    </Modal>
  );
}
