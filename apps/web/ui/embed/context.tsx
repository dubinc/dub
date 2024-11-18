import React, { createContext, useContext } from "react";

interface DubContextType {
  publicToken: string;
}

const DubContext = createContext<DubContextType | undefined>(undefined);

export const DubProvider: React.FC<
  DubContextType & { children: React.ReactNode }
> = ({ publicToken, children }) => {
  return (
    <DubContext.Provider value={{ publicToken }}>
      {children}
    </DubContext.Provider>
  );
};

export const useDub = () => {
  const context = useContext(DubContext);

  if (context === undefined) {
    throw new Error("useDub must be used within a DubProvider");
  }

  return context;
};
