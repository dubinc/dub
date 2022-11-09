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
        className="inline-block max-h-[calc(100vh-150px)] w-full max-w-screen-xl transform overflow-scroll bg-gray-50
        align-middle shadow-xl scrollbar-hide sm:rounded-2xl sm:border sm:border-gray-200"
      >
        <button
          className="group sticky top-4 z-30 float-right m-4 hidden rounded-full p-3 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:scale-75 sm:block"
          autoFocus={false}
          onClick={() => {
            router.push("/", undefined, { scroll: false });
          }}
        >
          <X className="h-6 w-6" />
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
