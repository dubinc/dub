import {
  defaultLinksDisplayProperties,
  LinksDisplayProperty,
  linksSortOptions,
  LinksSortSlug,
  LinksViewMode,
  linksViewModes,
} from "@/lib/links/links-display";
import { useWorkspacePreferences } from "@/lib/swr/use-workspace-preferences";
import { linksDisplaySchema } from "@/lib/zod/schemas/workspace-preferences";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import { z } from "zod";

type LinksDisplayKey = keyof z.infer<typeof linksDisplaySchema>;
type LinksDisplayValue<K extends LinksDisplayKey> = z.infer<
  typeof linksDisplaySchema
>[K];

function useLinksDisplayOption<K extends LinksDisplayKey>(
  key: K,
  persisted: z.infer<typeof linksDisplaySchema>,
  overrideValue?: LinksDisplayValue<K>,
): [
  LinksDisplayValue<K>,
  Dispatch<SetStateAction<LinksDisplayValue<K>>>,
  () => void,
] {
  const [value, setValue] = useState(overrideValue ?? persisted[key]);

  return [value, setValue, () => setValue(persisted[key])];
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

const parseSort = (sort: string) =>
  linksSortOptions.find(({ slug }) => slug === sort)?.slug ??
  linksSortOptions[0].slug;

export function LinksDisplayProvider({ children }: PropsWithChildren) {
  const searchParams = useSearchParams();
  const sortRaw = searchParams?.get("sortBy");
  const showArchivedRaw = searchParams?.get("showArchived");

  const [persisted, setPersisted] = useWorkspacePreferences("linksDisplay", {
    viewMode: linksViewModes[0],
    sortBy: linksSortOptions[0].slug,
    showArchived: false,
    displayProperties: defaultLinksDisplayProperties,
  });

  const [viewMode, setViewMode, resetViewMode] = useLinksDisplayOption(
    "viewMode",
    persisted!,
  );

  const [sortBy, setSort, resetSort] = useLinksDisplayOption(
    "sortBy",
    persisted!,
    sortRaw ? parseSort(sortRaw) : undefined,
  );

  const [showArchived, setShowArchived, resetShowArchived] =
    useLinksDisplayOption(
      "showArchived",
      persisted!,
      showArchivedRaw ? showArchivedRaw === "true" : undefined,
    );

  const [displayProperties, setDisplayProperties, resetDisplayProperties] =
    useLinksDisplayOption("displayProperties", persisted!);

  const isDirty = useMemo(() => {
    if (viewMode !== persisted?.viewMode) return true;
    if (sortBy !== persisted?.sortBy) return true;
    if (showArchived !== persisted?.showArchived) return true;
    if (
      displayProperties.slice().sort().join(",") !==
      persisted?.displayProperties.slice().sort().join(",")
    )
      return true;

    return false;
  }, [
    JSON.stringify(persisted),
    viewMode,
    sortBy,
    showArchived,
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
        persist: () =>
          setPersisted({
            viewMode,
            sortBy,
            showArchived,
            displayProperties,
          }),
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
