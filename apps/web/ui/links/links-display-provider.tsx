import {
  defaultLinksDisplayProperties,
  LinksDisplayProperty,
  linksDisplayPropertyIds,
  linksSortOptions,
  LinksSortSlug,
  LinksViewMode,
  linksViewModes,
} from "@/lib/links/links-display";
import { useLocalStorage } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useMemo,
  useState,
} from "react";

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
  displayProperties: LinksDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<LinksDisplayProperty[]>>;
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
  displayProperties: defaultLinksDisplayProperties,
  setDisplayProperties: () => {},
  sortBy: linksSortOptions[0].slug,
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
  linksViewModes.find((vm) => vm === viewModeRaw) ?? linksViewModes[0];

const parseDisplayProperties = (displayPropertiesRaw: string[]) =>
  linksDisplayPropertyIds.filter(
    (p) => displayPropertiesRaw.findIndex((pr) => pr === p) !== -1,
  );

const parseSort = (sort: string) =>
  linksSortOptions.find(({ slug }) => slug === sort)?.slug ??
  linksSortOptions[0].slug;

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
    linksViewModes[0],
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
    linksSortOptions[0].slug,
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
  } = useLinksDisplayOption<LinksDisplayProperty[]>(
    "display-properties",
    parseDisplayProperties,
    defaultLinksDisplayProperties,
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
