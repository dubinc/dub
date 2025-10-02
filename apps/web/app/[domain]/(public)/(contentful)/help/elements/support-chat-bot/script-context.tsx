"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface ScriptContextType {
  scriptsLoaded: boolean;
  setScriptsLoaded: (loaded: boolean) => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const useScriptContext = () => {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error("useScriptContext must be used within a ScriptProvider");
  }
  return context;
};

export const ScriptProvider = ({ children }: { children: ReactNode }) => {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  return (
    <ScriptContext.Provider value={{ scriptsLoaded, setScriptsLoaded }}>
      {children}
    </ScriptContext.Provider>
  );
};
