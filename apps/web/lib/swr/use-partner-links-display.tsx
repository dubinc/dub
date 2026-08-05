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

export type PartnerLinksViewMode = "cards" | "rows";

export type PartnerLinksDisplayProperty = "link" | "title";

export const partnerLinksDisplayProperties: {
  id: PartnerLinksDisplayProperty;
  label: string;
  switch: PartnerLinksDisplayProperty;
}[] = [
  { id: "link", label: "Short link", switch: "title" },
  { id: "title", label: "Title", switch: "link" },
];

const DEFAULT_DISPLAY_PROPERTIES: PartnerLinksDisplayProperty[] = ["link"];
const STORAGE_KEY = "partnerLinksDisplay";

type PartnerLinksDisplayPreferences = {
  viewMode: PartnerLinksViewMode;
  displayProperties: PartnerLinksDisplayProperty[];
};

function resolveDefaultViewMode({
  linksCount,
  showDetailedAnalytics,
}: {
  linksCount?: number;
  showDetailedAnalytics?: boolean;
}): PartnerLinksViewMode {
  if ((linksCount && linksCount > 5) || !showDetailedAnalytics) return "rows";
  return "cards";
}

function readLegacyPrefs(): PartnerLinksDisplayPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const preferTitleRaw = window.localStorage.getItem(
      "partnerLinksDisplayPreferTitle",
    );
    const viewModeRaw = window.localStorage.getItem("partnerLinksViewMode");

    if (preferTitleRaw == null && viewModeRaw == null) {
      return null;
    }

    const preferTitle = preferTitleRaw ? JSON.parse(preferTitleRaw) : false;
    const parsedViewMode = viewModeRaw ? JSON.parse(viewModeRaw) : null;
    const viewMode: PartnerLinksViewMode =
      parsedViewMode === "cards" || parsedViewMode === "rows"
        ? parsedViewMode
        : "cards";

    return {
      viewMode,
      displayProperties: preferTitle ? ["title"] : DEFAULT_DISPLAY_PROPERTIES,
    };
  } catch {
    return null;
  }
}

function clearLegacyPrefs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("partnerLinksDisplayPreferTitle");
  window.localStorage.removeItem("partnerLinksViewMode");
}

/** Read persisted partner links display prefs (for Analytics / Events / filters). */
export function usePartnerLinksDisplay() {
  const [persisted, setPersisted] =
    useSyncedLocalStorage<PartnerLinksDisplayPreferences | null>(
      STORAGE_KEY,
      null,
    );

  useEffect(() => {
    if (persisted) return;
    const legacy = readLegacyPrefs();
    if (!legacy) return;
    setPersisted(legacy);
    clearLegacyPrefs();
  }, [persisted, setPersisted]);

  return {
    viewMode: persisted?.viewMode ?? "cards",
    displayProperties:
      persisted?.displayProperties ?? DEFAULT_DISPLAY_PROPERTIES,
  };
}

type PartnerLinksDisplayContextValue = {
  viewMode: PartnerLinksViewMode;
  setViewMode: Dispatch<SetStateAction<PartnerLinksViewMode>>;
  displayProperties: PartnerLinksDisplayProperty[];
  setDisplayProperties: Dispatch<
    SetStateAction<PartnerLinksDisplayProperty[]>
  >;
  isDirty: boolean;
  persist: () => void;
  reset: () => void;
};

export const PartnerLinksDisplayContext =
  createContext<PartnerLinksDisplayContextValue>({
    viewMode: "cards",
    setViewMode: () => {},
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

  useEffect(() => {
    if (persisted) return;
    const legacy = readLegacyPrefs();
    if (!legacy) return;
    setPersisted(legacy);
    clearLegacyPrefs();
  }, [persisted, setPersisted]);

  const resolvedPersisted = useMemo<PartnerLinksDisplayPreferences>(() => {
    if (persisted) return persisted;
    return {
      viewMode: resolveDefaultViewMode({
        linksCount,
        showDetailedAnalytics,
      }),
      displayProperties: DEFAULT_DISPLAY_PROPERTIES,
    };
  }, [persisted, linksCount, showDetailedAnalytics]);

  const [viewMode, setViewMode] = useState<PartnerLinksViewMode>(
    resolvedPersisted.viewMode,
  );
  const [displayProperties, setDisplayProperties] = useState<
    PartnerLinksDisplayProperty[]
  >(resolvedPersisted.displayProperties);

  // Sync draft when persisted defaults resolve (e.g. after links load / migration)
  useEffect(() => {
    if (persisted) {
      setViewMode(persisted.viewMode);
      setDisplayProperties(persisted.displayProperties);
      return;
    }
    setViewMode(resolvedPersisted.viewMode);
    setDisplayProperties(resolvedPersisted.displayProperties);
  }, [persisted, resolvedPersisted]);

  const isDirty = useMemo(() => {
    if (viewMode !== resolvedPersisted.viewMode) return true;
    if (
      displayProperties.slice().sort().join(",") !==
      resolvedPersisted.displayProperties.slice().sort().join(",")
    ) {
      return true;
    }
    return false;
  }, [viewMode, displayProperties, resolvedPersisted]);

  return (
    <PartnerLinksDisplayContext.Provider
      value={{
        viewMode,
        setViewMode,
        displayProperties,
        setDisplayProperties,
        isDirty,
        persist: () =>
          setPersisted({
            viewMode,
            displayProperties,
          }),
        reset: () => {
          setViewMode(resolvedPersisted.viewMode);
          setDisplayProperties(resolvedPersisted.displayProperties);
        },
      }}
    >
      {children}
    </PartnerLinksDisplayContext.Provider>
  );
}
