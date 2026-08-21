"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const IntegrationsSubpageContext = createContext<{
  title: string | null;
  setTitle: (title: string | null) => void;
} | null>(null);

export function IntegrationsSubpageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [title, setTitle] = useState<string | null>(null);

  return (
    <IntegrationsSubpageContext.Provider value={{ title, setTitle }}>
      {children}
    </IntegrationsSubpageContext.Provider>
  );
}

export function useIntegrationsSubpage() {
  const context = useContext(IntegrationsSubpageContext);

  if (!context) {
    throw new Error(
      "useIntegrationsSubpage must be used within IntegrationsSubpageProvider",
    );
  }

  return context;
}

export function SetIntegrationsSubpageTitle({ title }: { title: string }) {
  const { setTitle } = useIntegrationsSubpage();

  useEffect(() => {
    setTitle(title);

    return () => setTitle(null);
  }, [title, setTitle]);

  return null;
}
