import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from "react";

type ChartTooltipSyncContextType = {
  tooltipDate?: Date | null;
  setTooltipDate?: Dispatch<SetStateAction<Date | null | undefined>>;
};

export const ChartTooltipSyncContext =
  createContext<ChartTooltipSyncContextType>({});

export function ChartTooltipSync({ children }: PropsWithChildren) {
  const [tooltipDate, setTooltipDate] = useState<Date | null | undefined>(
    undefined,
  );

  return (
    <ChartTooltipSyncContext.Provider value={{ tooltipDate, setTooltipDate }}>
      {children}
    </ChartTooltipSyncContext.Provider>
  );
}
