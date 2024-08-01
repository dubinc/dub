"use client";

import { PropsWithChildren, createContext, useState } from "react";

export const EventsContext = createContext<{
  exportQueryString?: string;
  setExportQueryString?: (queryString: string) => void;
}>({});

export function EventsProvider({ children }: PropsWithChildren) {
  const [exportQueryString, setExportQueryString] = useState<string>();

  return (
    <EventsContext.Provider value={{ exportQueryString, setExportQueryString }}>
      {children}
    </EventsContext.Provider>
  );
}
