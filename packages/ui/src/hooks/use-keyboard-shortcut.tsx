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
  options: { modal?: boolean } & Pick<
    KeyboardShortcutListener,
    "enabled" | "priority"
  > = {},
) {
  const id = useId();

  const { listeners, setListeners } = useContext(KeyboardShortcutContext);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const existingModalBackdrop = document.getElementById("modal-backdrop");

      // Ignore shortcuts if the user is holding a modifier key, typing in an input or textarea, or in a modal
      if (
        e.metaKey ||
        e.ctrlKey ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        !!existingModalBackdrop !== !!options.modal
      )
        return;

      // Ignore shortcut if it doesn't match this listener
      if (Array.isArray(key) ? !key.includes(e.key) : e.key !== key) return;

      // Find enabled listeners that match the key
      const matchingListeners = listeners.filter(
        (l) =>
          l.enabled !== false &&
          (Array.isArray(l.key) ? l.key.includes(e.key) : l.key === e.key),
      );

      if (!matchingListeners.length) return;

      // Sort the listeners by priority
      const topListener = stableSort(
        matchingListeners,
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      ).slice(-1)[0];

      // Check if this is the top listener
      if (topListener.id !== id) return;

      e.preventDefault();
      callback(e);
    },
    [key, listeners, id, callback],
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
