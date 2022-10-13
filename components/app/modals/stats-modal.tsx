import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { UIEvent } from "react";
import { X } from "@/components/shared/icons";
import Modal from "@/components/shared/modal";
import Stats from "@/components/stats";

function StatsModalHelper({
  showStatsModal,
  setShowStatsModal,
}: {
  showStatsModal: boolean;
  setShowStatsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [atModalTop, setAtModalTop] = useState(false);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (event.currentTarget.scrollTop > 144) {
      setAtModalTop(true);
    } else {
      setAtModalTop(false);
    }
  };

  return (
    <Modal
      showModal={showStatsModal}
      setShowModal={setShowStatsModal}
      bgColor="bg-gray-50"
    >
      <div
        onScroll={handleScroll}
        className="inline-block w-full max-w-screen-xl max-h-[calc(100vh-150px)] overflow-scroll scrollbar-hide bg-gray-50
        align-middle transform sm:border sm:border-gray-200 shadow-xl sm:rounded-2xl"
      >
        <button
          className="hidden sm:block sticky top-4 z-30 p-3 m-4 rounded-full float-right group hover:bg-gray-100 focus:outline-none active:scale-75 transition-all duration-75"
          autoFocus={false}
          onClick={() => {
            router.push("/", undefined, { scroll: false });
          }}
        >
          <X className="w-6 h-6" />
        </button>
        <Stats atModalTop={atModalTop} />
      </div>
    </Modal>
  );
}

export function useStatsModal() {
  const [showStatsModal, setShowStatsModal] = useState(false);

  const StatsModal = useCallback(() => {
    return (
      <StatsModalHelper
        showStatsModal={showStatsModal}
        setShowStatsModal={setShowStatsModal}
      />
    );
  }, [showStatsModal, setShowStatsModal]);

  return useMemo(
    () => ({ setShowStatsModal, StatsModal }),
    [setShowStatsModal, StatsModal],
  );
}
