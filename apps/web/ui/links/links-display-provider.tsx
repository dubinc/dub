import { STORE_KEYS, useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { useLocalStorage } from "@dub/ui";
import { PropsWithChildren, createContext, useMemo } from "react";

export const linkViewModes = ["cards", "rows"] as const;

export type LinksViewMode = (typeof linkViewModes)[number];

export const sortOptions = [
  {
    display: "Date created",
    slug: "createdAt",
  },
  {
    display: "Total clicks",
    slug: "clicks",
  },
  {
    display: "Last clicked",
    slug: "lastClicked",
  },
  {
    display: "Total sales",
    slug: "saleAmount",
  },
] as const;

export type LinksSortSlug = (typeof sortOptions)[number]["slug"];

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

const defaultViewMode = linkViewModes[0];
const defaultSortBy = sortOptions[0].slug;
const defaultShowArchived = false;
export const defaultDisplayProperties: LinkDisplayProperty[] = [
  "icon",
  "link",
  "url",
  "createdAt",
  "user",
  "tags",
  "analytics",
];

type PersistedLinksDisplay = {
  viewMode: LinksViewMode;
  sortBy: LinksSortSlug;
  showArchived: boolean;
  displayProperties: LinkDisplayProperty[];
};

function useLinksDisplayOption<T>(
  key: string,
  defaultValue: T,
  parseValue: (value: any) => T,
) {
  const [value, setValue, { remove }] = useLocalStorage<T | undefined>(
    `links-display-${key}`,
    undefined,
  );

  return {
    value: parseValue(value ?? defaultValue),
    setValue,
    reset: remove,
  };
}

export const LinksDisplayContext = createContext<{
  viewMode: LinksViewMode;
  setViewMode: (mode: LinksViewMode) => void;
  displayProperties: LinkDisplayProperty[];
  setDisplayProperties: (properties: LinkDisplayProperty[]) => void;
  sortBy: LinksSortSlug;
  setSort: (sort: LinksSortSlug) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  isLoading: boolean;
  isDirty: boolean;
  persist: () => void;
  reset: () => void;
}>({
  viewMode: "cards",
  setViewMode: () => {},
  displayProperties: defaultDisplayProperties,
  setDisplayProperties: () => {},
  sortBy: sortOptions[0].slug,
  setSort: () => {},
  showArchived: false,
  setShowArchived: () => {},
  /** Whether the persisted values are being loaded */
  isLoading: false,
  /** Whether the current values differ from the persisted values */
  isDirty: false,
  /** Updates the persisted values to the current values */
  persist: () => {},
  /** Resets the current values to the persisted values */
  reset: () => {},
});

const parseViewMode = (viewModeRaw: string) =>
  linkViewModes.find((vm) => vm === viewModeRaw) ?? linkViewModes[0];

const parseDisplayProperties = (displayPropertiesRaw: string[]) =>
  linkDisplayPropertyIds.filter(
    (p) => displayPropertiesRaw.findIndex((pr) => pr === p) !== -1,
  );

const parseSortBy = (sortBy: string) =>
  sortOptions.find(({ slug }) => slug === sortBy)?.slug ?? sortOptions[0].slug;

const parseShowArchived = (showArchived: boolean) => showArchived === true;

const parseObject = (object: any): PersistedLinksDisplay | undefined =>
  object
    ? {
        viewMode: parseViewMode(object.viewMode),
        sortBy: parseSortBy(object.sortBy),
        showArchived: parseShowArchived(object.showArchived),
        displayProperties: parseDisplayProperties(object.displayProperties),
      }
    : undefined;

export function LinksDisplayProvider({ children }: PropsWithChildren) {
  // Persisted values to workspace store
  const [persistedRaw, setPersisted, { loading: isLoading }] =
    useWorkspaceStore<PersistedLinksDisplay>(STORE_KEYS.linksDisplay);
  const persisted = useMemo(() => parseObject(persistedRaw), [persistedRaw]);

  // View mode
  const {
    value: viewMode,
    setValue: setViewMode,
    reset: resetViewMode,
  } = useLinksDisplayOption<LinksViewMode>(
    "view-mode",
    persisted?.viewMode ?? defaultViewMode,
    parseViewMode,
  );

  // Sort
  const {
    value: sortBy,
    setValue: setSort,
    reset: resetSort,
  } = useLinksDisplayOption<LinksSortSlug>(
    "sortBy",
    persisted?.sortBy ?? defaultSortBy,
    parseSortBy,
  );

  // Show archived
  const {
    value: showArchived,
    setValue: setShowArchived,
    reset: resetShowArchived,
  } = useLinksDisplayOption<boolean>(
    "show-archived",
    persisted?.showArchived ?? defaultShowArchived,
    parseShowArchived,
  );

  // Display properties
  const {
    value: displayProperties,
    setValue: setDisplayProperties,
    reset: resetDisplayProperties,
  } = useLinksDisplayOption<LinkDisplayProperty[]>(
    "display-properties",
    persisted?.displayProperties ?? defaultDisplayProperties,
    parseDisplayProperties,
  );

  const isDirty = useMemo(() => {
    if (viewMode !== (persisted?.viewMode ?? defaultViewMode)) return true;
    if (sortBy !== (persisted?.sortBy ?? defaultSortBy)) return true;
    if (showArchived !== (persisted?.showArchived ?? defaultShowArchived))
      return true;
    if (
      displayProperties.slice().sort().join(",") !==
      (persisted?.displayProperties ?? defaultDisplayProperties)
        .slice()
        .sort()
        .join(",")
    )
      return true;

    return false;
  }, [persisted, viewMode, sortBy, showArchived, displayProperties]);

  return (
    <LinksDisplayContext.Provider
      value={{
        viewMode: viewMode as LinksViewMode,
        setViewMode,
        displayProperties,
        setDisplayProperties,
        sortBy: sortBy as LinksSortSlug,
        setSort,
        showArchived,
        setShowArchived,
        isLoading,
        isDirty,
        persist: () => {
          setPersisted({
            viewMode: viewMode,
            sortBy: sortBy,
            showArchived: showArchived,
            displayProperties: displayProperties,
          });
        },
        reset: () => {
          resetViewMode();
          resetSort();
          resetShowArchived();
          resetDisplayProperties();
        },
      }}
    >
      {children}
    </LinksDisplayContext.Provider>
  );
}
