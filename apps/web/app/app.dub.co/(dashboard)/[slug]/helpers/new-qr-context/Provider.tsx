"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

interface NewQrContextType {
  newQrId?: string | null;
  setNewQrId?: Dispatch<SetStateAction<string | null>>;
}

// Create the context
const Context = createContext<NewQrContextType>({});

// Provider props interface
interface ProviderProps {
  children: ReactNode;
  newQrId?: string | null;
}

// Provider component
export function NewQrProvider({ children, newQrId }: ProviderProps) {
  const [newQrIdState, setNewQrIdState] = useState<string | null>(newQrId || null);

  return (
    <Context.Provider value={{ newQrId: newQrIdState, setNewQrId: setNewQrIdState }}>
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
