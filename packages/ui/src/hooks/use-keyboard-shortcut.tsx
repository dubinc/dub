import { stableSort } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";

type KeyboardShortcutListener = {
  id: string;
  key: string | string[];
  enabled?: boolean;
  priority?: number;
  modal?: boolean;
  sheet?: boolean;
};

export const KeyboardShortcutContext = createContext<{
  listeners: KeyboardShortcutListener[];
  setListeners: Dispatch<SetStateAction<KeyboardShortcutListener[]>>;
}>({
  listeners: [] as KeyboardShortcutListener[],
  setListeners: () => {},
});

export function KeyboardShortcutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [listeners, setListeners] = useState<KeyboardShortcutListener[]>([]);

  return (
    <KeyboardShortcutContext.Provider value={{ listeners, setListeners }}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
}

export function useKeyboardShortcut(
  key: KeyboardShortcutListener["key"],
  callback: (e: KeyboardEvent) => void,
  options: Pick<
    KeyboardShortcutListener,
    "enabled" | "priority" | "modal" | "sheet"
  > = {},
) {
  const id = useId();

  const { listeners, setListeners } = useContext(KeyboardShortcutContext);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (options.enabled === false) return;

      const target = e.target as HTMLElement;
      const existingModalBackdrop = document.getElementById("modal-backdrop");
      const existingSheetBackdrop = document.querySelector(
        "[data-sheet-overlay]",
      );

      // Ignore shortcuts if the user is typing in an input or textarea, or in a modal
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        (target.hasAttribute("contenteditable") &&
          target.getAttribute("contenteditable") !== "false") ||
        !!existingModalBackdrop !== !!options.modal ||
        !!existingSheetBackdrop !== !!options.sheet
      )
        return;

      const pressedKey = [
        ...(e.metaKey ? ["meta"] : []),
        ...(e.ctrlKey ? ["ctrl"] : []),
        ...(e.altKey ? ["alt"] : []),
        e.key,
      ].join("+");

      // Ignore shortcut if it doesn't match this listener
      if (Array.isArray(key) ? !key.includes(pressedKey) : pressedKey !== key)
        return;

      // Find enabled listeners that match the key
      const matchingListeners = listeners.filter(
        (l) =>
          l.enabled !== false &&
          !!existingModalBackdrop === !!l.modal &&
          !!existingSheetBackdrop === !!l.sheet &&
          (Array.isArray(l.key)
            ? l.key.includes(pressedKey)
            : l.key === pressedKey),
      );

      if (!matchingListeners.length) return;

      // Sort the listeners by priority
      const topListener = stableSort(
        matchingListeners,
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      )[0];

      // Check if this is the top listener
      if (topListener.id !== id) return;

      e.preventDefault();
      callback(e);
    },
    [
      key,
      listeners,
      id,
      callback,
      options.enabled,
      options.modal,
      options.sheet,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // Register/unregister the listener
  useEffect(() => {
    setListeners((prev) => [
      ...prev.filter((listener) => listener.id !== id),
      { id, key, ...options },
    ]);

    return () =>
      setListeners((prev) => prev.filter((listener) => listener.id !== id));
  }, [JSON.stringify(key), options.enabled, options.priority]);
}
