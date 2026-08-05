"use client";

import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

export type PartnerLinksDisplayOption = "full" | "cards";

type PartnerLinksDisplayProperty = "link" | "title";

const DEFAULT_DISPLAY_PROPERTIES: PartnerLinksDisplayProperty[] = ["link"];
const STORAGE_KEY = "partnerLinksDisplay";

type PartnerLinksDisplayPreferences = {
  displayOption: PartnerLinksDisplayOption;
  displayProperties: PartnerLinksDisplayProperty[];
};

/** Read persisted partner links display prefs (for Analytics / Events / filters). */
export function usePartnerLinksDisplay() {
  const [persisted] =
    useSyncedLocalStorage<PartnerLinksDisplayPreferences | null>(
      STORAGE_KEY,
      null,
    );

  return {
    displayProperties:
      persisted?.displayProperties ?? DEFAULT_DISPLAY_PROPERTIES,
  };
}

type PartnerLinksDisplayContextValue = {
  displayOption: PartnerLinksDisplayOption;
  setDisplayOption: Dispatch<SetStateAction<PartnerLinksDisplayOption>>;
  displayProperties: PartnerLinksDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<PartnerLinksDisplayProperty[]>>;
  isDirty: boolean;
  persist: () => void;
  reset: () => void;
};

export const PartnerLinksDisplayContext =
  createContext<PartnerLinksDisplayContextValue>({
    displayOption: "full",
    setDisplayOption: () => {},
    displayProperties: DEFAULT_DISPLAY_PROPERTIES,
    setDisplayProperties: () => {},
    isDirty: false,
    persist: () => {},
    reset: () => {},
  });

export function PartnerLinksDisplayProvider({
  children,
  linksCount,
  showDetailedAnalytics,
}: PropsWithChildren<{
  linksCount?: number;
  showDetailedAnalytics?: boolean;
}>) {
  const [persisted, setPersisted] =
    useSyncedLocalStorage<PartnerLinksDisplayPreferences | null>(
      STORAGE_KEY,
      null,
    );

  const resolvedPersisted = useMemo<PartnerLinksDisplayPreferences>(() => {
    if (persisted) return persisted;
    return {
      displayOption:
        (linksCount && linksCount > 5) || !showDetailedAnalytics
          ? "cards"
          : "full",
      displayProperties: DEFAULT_DISPLAY_PROPERTIES,
    };
  }, [persisted, linksCount, showDetailedAnalytics]);

  const [displayOption, setDisplayOption] = useState<PartnerLinksDisplayOption>(
    resolvedPersisted.displayOption,
  );
  const [displayProperties, setDisplayProperties] = useState<
    PartnerLinksDisplayProperty[]
  >(resolvedPersisted.displayProperties);

  // Sync draft when persisted defaults resolve (e.g. after links load)
  useEffect(() => {
    setDisplayOption(resolvedPersisted.displayOption);
    setDisplayProperties(resolvedPersisted.displayProperties);
  }, [resolvedPersisted]);

  const isDirty = useMemo(() => {
    if (displayOption !== resolvedPersisted.displayOption) return true;
    if (
      displayProperties.slice().sort().join(",") !==
      resolvedPersisted.displayProperties.slice().sort().join(",")
    ) {
      return true;
    }
    return false;
  }, [displayOption, displayProperties, resolvedPersisted]);

  return (
    <PartnerLinksDisplayContext.Provider
      value={{
        displayOption,
        setDisplayOption,
        displayProperties,
        setDisplayProperties,
        isDirty,
        persist: () =>
          setPersisted({
            displayOption,
            displayProperties,
          }),
        reset: () => {
          setDisplayOption(resolvedPersisted.displayOption);
          setDisplayProperties(resolvedPersisted.displayProperties);
        },
      }}
    >
      {children}
    </PartnerLinksDisplayContext.Provider>
  );
}
