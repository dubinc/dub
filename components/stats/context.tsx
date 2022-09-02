import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import StatsModal from "@/components/stats/stats-modal";

const StatsContext = createContext(
  {} as {
    showStatsModal: boolean;
    setShowStatsModal: Dispatch<SetStateAction<boolean>>;
    atTop: boolean;
    setAtTop: Dispatch<SetStateAction<boolean>>;
  }
);

export const StatsProvider = ({ children }: { children: ReactNode }) => {
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [atTop, setAtTop] = useState(false);

  useEffect(() => {
    if (!showStatsModal) {
      setAtTop(false);
    }
  }, [showStatsModal]);

  const value = {
    showStatsModal,
    setShowStatsModal,
    atTop,
    setAtTop,
  };

  return (
    <StatsContext.Provider value={value}>
      <StatsModal />
      {children}
    </StatsContext.Provider>
  );
};
export const useStatsContext = () => {
  const value = useContext(StatsContext);
  // if context is undefined this means it was used outside of its provider
  // you can throw an error telling that to your fellow developers
  if (!value) {
    throw new Error("useStatsContext must be used under <StatsProvider/>");
  }
  return value;
};
