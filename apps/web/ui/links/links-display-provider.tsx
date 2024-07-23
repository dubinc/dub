import { useLocalStorage } from "@dub/ui";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useMemo,
  useState,
} from "react";

export const linkViewModes = ["cards", "rows"] as const;

export type LinksViewMode = (typeof linkViewModes)[number];

export const linkDisplayPropertyIds = [
  "icon",
  "link",
  "url",
  "title",
  "description",
  "createdAt",
  "user",
  "tags",
  "analytics",
] as const;

export const linkDisplayProperties: {
  id: LinkDisplayProperty;
  label: string;
  switch?: LinkDisplayProperty;
  mobile?: boolean;
}[] = [
  { id: "icon", label: "Icon", mobile: false },
  { id: "link", label: "Short link", switch: "title" },
  { id: "url", label: "Destination URL", switch: "description" },
  { id: "title", label: "Title", switch: "link" },
  { id: "description", label: "Description", switch: "url" },
  { id: "createdAt", label: "Created Date", mobile: false },
  { id: "user", label: "Creator", mobile: false },
  { id: "tags", label: "Tags" },
  { id: "analytics", label: "Analytics" },
];

export type LinkDisplayProperty = (typeof linkDisplayPropertyIds)[number];

export const defaultDisplayProperties: LinkDisplayProperty[] = [
  "icon",
  "link",
  "url",
  "createdAt",
  "user",
  "tags",
  "analytics",
];

function parseViewMode(viewModeRaw: string) {
  return (linkViewModes as unknown as string[]).includes(viewModeRaw)
    ? viewModeRaw
    : linkViewModes[0];
}

function parseDisplayProperties(displayPropertiesRaw: string[]) {
  return displayPropertiesRaw.filter((p) =>
    (linkDisplayPropertyIds as unknown as string[]).includes(p),
  ) as LinkDisplayProperty[];
}

export const LinksDisplayContext = createContext<{
  viewMode: LinksViewMode;
  setViewMode: Dispatch<SetStateAction<LinksViewMode>>;
  displayProperties: LinkDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<LinkDisplayProperty[]>>;
  isDirty: boolean;
  persist: () => void;
  reset: () => void;
}>({
  viewMode: "cards",
  setViewMode: () => {},
  displayProperties: defaultDisplayProperties,
  setDisplayProperties: () => {},
  /** Whether the current values differ from the persisted values */
  isDirty: false,
  /** Updates the persisted values to the current values */
  persist: () => {},
  /** Resets the current values to the persisted values */
  reset: () => {},
});

export function LinksDisplayProvider({ children }: PropsWithChildren) {
  const [viewModePersisted, setViewModePersisted] =
    useLocalStorage<LinksViewMode>("links-view-mode", linkViewModes[0]);

  const [viewMode, setViewMode] = useState(parseViewMode(viewModePersisted));

  const [displayPropertiesPersisted, setDisplayPropertiesPersisted] =
    useLocalStorage<string[]>(
      "links-display-properties",
      defaultDisplayProperties,
    );

  const [displayProperties, setDisplayProperties] = useState(
    parseDisplayProperties(displayPropertiesPersisted),
  );

  const isDirty = useMemo(() => {
    if (viewMode !== parseViewMode(viewModePersisted)) return true;
    if (
      displayProperties.slice().sort().join(",") !==
      parseDisplayProperties(displayPropertiesPersisted)
        .slice()
        .sort()
        .join(",")
    )
      return true;

    return false;
  }, [
    viewModePersisted,
    viewMode,
    displayPropertiesPersisted,
    displayProperties,
  ]);

  return (
    <LinksDisplayContext.Provider
      value={{
        viewMode: viewMode as LinksViewMode,
        setViewMode,
        displayProperties,
        setDisplayProperties,
        isDirty,
        persist: () => {
          setViewModePersisted(viewMode as LinksViewMode);
          setDisplayPropertiesPersisted(displayProperties);
        },
        reset: () => {
          setViewMode(parseViewMode(viewModePersisted));
          setDisplayProperties(
            parseDisplayProperties(displayPropertiesPersisted),
          );
        },
      }}
    >
      {children}
    </LinksDisplayContext.Provider>
  );
}
