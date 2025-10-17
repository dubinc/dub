import { VisibilityState } from "@tanstack/react-table";
import { useLocalStorage } from "./use-local-storage";

// Single table configuration
type SingleTableConfig = {
  all: string[];
  defaultVisible: string[];
};

// Multi-tab table configuration
type MultiTableConfig<T extends string> = Record<T, SingleTableConfig>;

// Type guard for SingleTableConfig
function isSingleTableConfig(config: any): config is SingleTableConfig {
  return (
    config &&
    typeof config === "object" &&
    Array.isArray(config.all) &&
    Array.isArray(config.defaultVisible)
  );
}

// Generic hook for single table
export function useColumnVisibility<T extends SingleTableConfig>(
  storageKey: string,
  config: T,
): {
  columnVisibility: VisibilityState;
  setColumnVisibility: (visibility: VisibilityState) => void;
};

// Generic hook for multi-tab table
export function useColumnVisibility<T extends string>(
  storageKey: string,
  config: MultiTableConfig<T>,
): {
  columnVisibility: Record<T, VisibilityState>;
  setColumnVisibility: (tab: T, visibility: VisibilityState) => void;
};

// Implementation
export function useColumnVisibility<T extends string>(
  storageKey: string,
  config: SingleTableConfig | MultiTableConfig<T>,
):
  | {
      columnVisibility: VisibilityState;
      setColumnVisibility: (visibility: VisibilityState) => void;
    }
  | {
      columnVisibility: Record<T, VisibilityState>;
      setColumnVisibility: (tab: T, visibility: VisibilityState) => void;
    } {
  // Check if this is a multi-tab configuration
  const isMultiTab = !isSingleTableConfig(config);

  if (isMultiTab) {
    // Multi-tab implementation
    const multiConfig = config as MultiTableConfig<T>;

    const getDefaultColumnVisibility = (tab: T) => {
      const columns = multiConfig[tab];
      return Object.fromEntries(
        columns.all.map((id) => [id, columns.defaultVisible.includes(id)]),
      );
    };

    const defaultState = Object.fromEntries(
      Object.keys(multiConfig).map((tab) => [
        tab,
        getDefaultColumnVisibility(tab as T),
      ]),
    ) as Record<T, VisibilityState>;

    const [columnVisibility, setColumnVisibilityState] = useLocalStorage<
      Record<T, VisibilityState>
    >(storageKey, defaultState);

    return {
      columnVisibility,
      setColumnVisibility: (tab: T, visibility: VisibilityState) => {
        // Ensure all columns for this tab are present in the new state
        const allColumns = multiConfig[tab].all;
        const currentTabState = columnVisibility[tab] || {};

        // Create a new state that preserves all columns, defaulting to false for missing ones
        const newTabState = Object.fromEntries(
          allColumns.map((columnId) => [
            columnId,
            columnId in visibility
              ? visibility[columnId]
              : currentTabState[columnId] ?? false,
          ]),
        );

        setColumnVisibilityState({ ...columnVisibility, [tab]: newTabState });
      },
    };
  } else {
    // Single table implementation
    const singleConfig = config as SingleTableConfig;

    const defaultState = Object.fromEntries(
      singleConfig.all.map((id) => [
        id,
        singleConfig.defaultVisible.includes(id),
      ]),
    );

    const [columnVisibility, setColumnVisibilityState] =
      useLocalStorage<VisibilityState>(storageKey, defaultState);

    return {
      columnVisibility,
      setColumnVisibility: (visibility: VisibilityState) => {
        // Ensure all columns are present in the new state
        const allColumns = singleConfig.all;
        const currentState = columnVisibility || {};

        // Create a new state that preserves all columns, defaulting to false for missing ones
        const newState = Object.fromEntries(
          allColumns.map((columnId) => [
            columnId,
            columnId in visibility
              ? visibility[columnId]
              : currentState[columnId] ?? false,
          ]),
        );

        setColumnVisibilityState(newState);
      },
    };
  }
}
