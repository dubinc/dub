import Modal from "@/components/shared/modal";
import Stats from ".";
import { useStatsContext } from "@/components/stats/context";
import { UIEvent } from "react";
import { useRouter } from "next/router";
import { X } from "@/components/shared/icons";

export default function StatsModal() {
  const router = useRouter();
  const { showStatsModal, setShowStatsModal, setAtTop } = useStatsContext();

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (event.currentTarget.scrollTop > 144) {
      setAtTop(true);
    } else {
      setAtTop(false);
    }
  };
  return (
    <Modal showModal={showStatsModal} setShowModal={setShowStatsModal}>
      <div
        onScroll={handleScroll}
        className="inline-block w-full max-w-screen-xl max-h-[calc(100vh-100px)] overflow-scroll scrollbar-hide bg-gray-50 dark:bg-black 
        align-middle transform border border-gray-200 dark:border-gray-600 shadow-xl dark:shadow-none rounded-2xl"
      >
        <button
          className="sticky top-4 z-10 p-3 m-4 rounded-full float-right group hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none active:scale-75 transition-all duration-75"
          autoFocus={false}
          onClick={() => {
            setShowStatsModal(false);
            router.push("/");
          }}
        >
          <X className="w-6 h-6" />
        </button>
        <Stats />
      </div>
    </Modal>
  );
}
