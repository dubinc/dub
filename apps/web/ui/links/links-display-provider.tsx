import { useLocalStorage } from "@dub/ui";
import { PropsWithChildren, createContext } from "react";

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
}[] = [
  { id: "icon", label: "Icon" },
  { id: "link", label: "Short link", switch: "title" },
  { id: "url", label: "Destination URL", switch: "description" },
  { id: "title", label: "Title", switch: "link" },
  { id: "description", label: "Description", switch: "url" },
  { id: "createdAt", label: "Created Date" },
  { id: "user", label: "Creator" },
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

export const LinksDisplayContext = createContext<{
  viewMode: LinksViewMode;
  setViewMode: (v: LinksViewMode) => void;
  displayProperties: LinkDisplayProperty[];
  setDisplayProperties: (p: LinkDisplayProperty[]) => void;
  reset: () => void;
}>({
  viewMode: "cards",
  setViewMode: () => {},
  displayProperties: defaultDisplayProperties,
  setDisplayProperties: () => {},
  reset: () => {},
});

export function LinksDisplayProvider({ children }: PropsWithChildren) {
  const [viewModeRaw, setViewMode] = useLocalStorage(
    "links-view-mode",
    linkViewModes[0],
  );

  const viewMode = linkViewModes.includes(viewModeRaw)
    ? viewModeRaw
    : linkViewModes[0];

  const [displayPropertiesRaw, setDisplayProperties] = useLocalStorage<
    string[]
  >("links-display-properties", defaultDisplayProperties);

  const displayProperties = (
    Array.isArray(displayPropertiesRaw)
      ? displayPropertiesRaw
      : defaultDisplayProperties
  ).filter((p) =>
    (linkDisplayPropertyIds as unknown as string[]).includes(p),
  ) as LinkDisplayProperty[];

  return (
    <LinksDisplayContext.Provider
      value={{
        viewMode: viewMode as LinksViewMode,
        setViewMode,
        displayProperties,
        setDisplayProperties,
        reset: () => {
          setDisplayProperties(defaultDisplayProperties);
          setViewMode(linkViewModes[0]);
        },
      }}
    >
      {children}
    </LinksDisplayContext.Provider>
  );
}
