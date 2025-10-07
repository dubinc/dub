"use client";

import { createContext, useContext, ReactNode, useState, SetStateAction, Dispatch } from "react";

interface NewQrContextType {
  newQrId?: string | null;
  setNewQrId?: Dispatch<SetStateAction<string | null>>;
}

// Create the context
const Context = createContext<NewQrContextType>({});

// Provider props interface
interface ProviderProps {
  children: ReactNode;
}

// Provider component
export function NewQrProvider({ children }: ProviderProps) {
  const [newQrId, setNewQrId] = useState<string | null>(null);

  return (
    <Context.Provider value={{ newQrId, setNewQrId }}>
      {children}
    </Context.Provider>
  );
}

// Custom hook to use the context
export function useNewQrContext() {
  return useContext(Context) || {};
}

// Export the context for advanced usage if needed
export { Context };
