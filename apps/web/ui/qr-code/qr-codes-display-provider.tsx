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

export const qrCodeViewModes = ["cards", "rows"] as const;

export type QrCodesViewMode = (typeof qrCodeViewModes)[number];

export const sortOptions = [
  {
    display: "Date created",
    slug: "createdAt",
  },
  {
    display: "Total scans",
    slug: "clicks",
  },
  {
    display: "Last scan",
    slug: "lastClicked",
  },
] as const;

export type QrCodesSortSlug = (typeof sortOptions)[number]["slug"];

export const qrCodeDisplayPropertyIds = [
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

export const qrCodeDisplayProperties: {
  id: QrCodeDisplayProperty;
  label: string;
  switch?: QrCodeDisplayProperty;
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

export type QrCodeDisplayProperty = (typeof qrCodeDisplayPropertyIds)[number];

export const defaultDisplayProperties: QrCodeDisplayProperty[] = [
  "icon",
  "link",
  "url",
  "createdAt",
  "user",
  "tags",
  "analytics",
];

function useQrCodeDisplayOption<T>(
  key: string,
  parsePersisted: (value: T) => T,
  defaultValue: T,
  overrideValue?: T,
) {
  const [valuePersisted, setValuePersisted] = useLocalStorage<T>(
    `qrs-display-${key}`,
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

export const QrCodesDisplayContext = createContext<{
  viewMode: QrCodesViewMode;
  setViewMode: Dispatch<SetStateAction<QrCodesViewMode>>;
  displayProperties: QrCodeDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<QrCodeDisplayProperty[]>>;
  sortBy: QrCodesSortSlug;
  setSort: Dispatch<SetStateAction<QrCodesSortSlug>>;
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
  qrCodeViewModes.find((vm) => vm === viewModeRaw) ?? qrCodeViewModes[0];

const parseDisplayProperties = (displayPropertiesRaw: string[]) =>
  qrCodeDisplayPropertyIds.filter(
    (p) => displayPropertiesRaw.findIndex((pr) => pr === p) !== -1,
  );

const parseSort = (sort: string) =>
  sortOptions.find(({ slug }) => slug === sort)?.slug ?? sortOptions[0].slug;

const parseShowArchived = (showArchived: boolean) => showArchived === true;

export function QrCodesDisplayProvider({ children }: PropsWithChildren) {
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
  } = useQrCodeDisplayOption<string>(
    "view-mode",
    parseViewMode,
    qrCodeViewModes[0],
  );

  // Sort
  const {
    value: sortBy,
    setValue: setSort,
    valuePersisted: sortPersisted,
    persist: persistSort,
    reset: resetSort,
  } = useQrCodeDisplayOption<string>(
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
  } = useQrCodeDisplayOption<boolean>(
    "show-archived",
    parseShowArchived,
    true,
    showArchivedRaw ? showArchivedRaw === "true" : undefined,
  );

  // Display properties
  const {
    value: displayProperties,
    setValue: setDisplayProperties,
    valuePersisted: displayPropertiesPersisted,
    persist: persistDisplayProperties,
    reset: resetDisplayProperties,
  } = useQrCodeDisplayOption<QrCodeDisplayProperty[]>(
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
    <QrCodesDisplayContext.Provider
      value={{
        viewMode: viewMode as QrCodesViewMode,
        setViewMode,
        displayProperties,
        setDisplayProperties,
        sortBy: sortBy as QrCodesSortSlug,
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
    </QrCodesDisplayContext.Provider>
  );
}
