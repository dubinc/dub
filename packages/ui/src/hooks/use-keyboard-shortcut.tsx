import { stableSort } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type KeyboardShortcutListener = {
  id: string;
  key: string | string[];
  callback: (e: KeyboardEvent) => void;
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
        existingModalBackdrop
      )
        return;

      // Find enabled listeners that match the key
      const matchingListeners = listeners.filter(
        (l) =>
          l.enabled !== false &&
          (Array.isArray(l.key) ? l.key.includes(e.key) : l.key === e.key),
      );

      if (!matchingListeners.length) return;

      // Sort the listeners by priority and call the top priority listener
      const topListener = stableSort(
        matchingListeners,
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      ).slice(-1)[0];

      e.preventDefault();
      topListener.callback(e);
    },
    [listeners],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <KeyboardShortcutContext.Provider value={{ listeners, setListeners }}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
}

export function useKeyboardShortcut(
  key: KeyboardShortcutListener["key"],
  callbackArg: KeyboardShortcutListener["callback"],
  options: Pick<KeyboardShortcutListener, "enabled" | "priority"> = {},
) {
  const id = useId();

  const { setListeners } = useContext(KeyboardShortcutContext);

  // Use a ref rather than the callback directly in case it isn't stable
  const callbackRef = useRef(callbackArg);

  useEffect(() => {
    callbackRef.current = callbackArg;
  }, [callbackArg]);

  // Register/unregister the listener
  useEffect(() => {
    setListeners((prev) => [
      ...prev.filter((listener) => listener.id !== id),
      { id, key, callback: callbackRef.current, ...options },
    ]);

    return () =>
      setListeners((prev) => prev.filter((listener) => listener.id !== id));
  }, [JSON.stringify(key), options.enabled, options.priority]);
}
