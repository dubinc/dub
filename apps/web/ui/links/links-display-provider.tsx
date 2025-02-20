import { useLocalStorage } from "@dub/ui";
import { useSearchParams } from "next/navigation";
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

function useLinksDisplayOption<T>(
  key: string,
  parsePersisted: (value: T) => T,
  defaultValue: T,
  overrideValue?: T,
) {
  const [valuePersisted, setValuePersisted] = useLocalStorage<T>(
    `links-display-${key}`,
    defaultValue,
  );
  const [value, setValue] = useState(overrideValue ?? valuePersisted);

  return {
    value,
    setValue,
    valuePersisted,
    setValuePersisted,
    persist: () => setValuePersisted(value),
    reset: () => setValue(parsePersisted(valuePersisted)),
  };
}

export const LinksDisplayContext = createContext<{
  viewMode: LinksViewMode;
  setViewMode: Dispatch<SetStateAction<LinksViewMode>>;
  displayProperties: LinkDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<LinkDisplayProperty[]>>;
  sortBy: LinksSortSlug;
  setSort: Dispatch<SetStateAction<LinksSortSlug>>;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>>;
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

const parseSort = (sort: string) =>
  sortOptions.find(({ slug }) => slug === sort)?.slug ?? sortOptions[0].slug;

const parseShowArchived = (showArchived: boolean) => showArchived === true;

export function LinksDisplayProvider({ children }: PropsWithChildren) {
  const searchParams = useSearchParams();
  const sortRaw = searchParams?.get("sortBy");
  const showArchivedRaw = searchParams?.get("showArchived");

  // View mode
  const {
    value: viewMode,
    setValue: setViewMode,
    valuePersisted: viewModePersisted,
    persist: persistViewMode,
    reset: resetViewMode,
  } = useLinksDisplayOption<string>(
    "view-mode",
    parseViewMode,
    linkViewModes[0],
  );

  // Sort
  const {
    value: sortBy,
    setValue: setSort,
    valuePersisted: sortPersisted,
    persist: persistSort,
    reset: resetSort,
  } = useLinksDisplayOption<string>(
    "sortBy",
    parseSort,
    sortOptions[0].slug,
    sortRaw ? parseSort(sortRaw) : undefined,
  );

  // Show archived
  const {
    value: showArchived,
    setValue: setShowArchived,
    valuePersisted: showArchivedPersisted,
    persist: persistShowArchived,
    reset: resetShowArchived,
  } = useLinksDisplayOption<boolean>(
    "show-archived",
    parseShowArchived,
    false,
    showArchivedRaw ? showArchivedRaw === "true" : undefined,
  );

  // Display properties
  const {
    value: displayProperties,
    setValue: setDisplayProperties,
    valuePersisted: displayPropertiesPersisted,
    persist: persistDisplayProperties,
    reset: resetDisplayProperties,
  } = useLinksDisplayOption<LinkDisplayProperty[]>(
    "display-properties",
    parseDisplayProperties,
    defaultDisplayProperties,
  );

  const isDirty = useMemo(() => {
    if (viewMode !== parseViewMode(viewModePersisted)) return true;
    if (sortBy !== parseSort(sortPersisted)) return true;
    if (showArchived !== parseShowArchived(showArchivedPersisted)) return true;
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
    sortPersisted,
    sortBy,
    showArchivedPersisted,
    showArchived,
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
        sortBy: sortBy as LinksSortSlug,
        setSort,
        showArchived,
        setShowArchived,
        isDirty,
        persist: () => {
          persistViewMode();
          persistDisplayProperties();
          persistSort();
          persistShowArchived();
        },
        reset: () => {
          resetViewMode();
          resetDisplayProperties();
          resetSort();
          resetShowArchived();
        },
      }}
    >
      {children}
    </LinksDisplayContext.Provider>
  );
}
