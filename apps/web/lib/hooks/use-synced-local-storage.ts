import { useLocalStorage } from "@dub/ui";
import { useEffect } from "react";

// Create a custom event channel for syncing
const createStorageEventChannel = () => {
  const listeners = new Set<(key: string, newValue: string) => void>();

  return {
    emit: (key: string, newValue: string) => {
      listeners.forEach((listener) => listener(key, newValue));
    },
    subscribe: (listener: (key: string, newValue: string) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const storageEventChannel = createStorageEventChannel();

export function useSyncedLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValueOriginal] = useLocalStorage<T>(key, initialValue);

  // Wrap the original setValue to emit events
  const setValue = (newValue: T | ((val: T) => T)) => {
    if (typeof newValue === "function") {
      const updater = newValue as (val: T) => T;
      const nextValue = updater(value);
      setValueOriginal(nextValue);
      storageEventChannel.emit(key, JSON.stringify(nextValue));
    } else {
      setValueOriginal(newValue);
      storageEventChannel.emit(key, JSON.stringify(newValue));
    }
  };

  useEffect(() => {
    // Listen for both storage events (cross-window) and custom events (same-window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        setValueOriginal(JSON.parse(e.newValue));
      }
    };

    const handleCustomEvent = (eventKey: string, newValue: string) => {
      if (eventKey === key) {
        setValueOriginal(JSON.parse(newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const unsubscribe = storageEventChannel.subscribe(handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      unsubscribe();
    };
  }, [key, setValueOriginal]);

  return [value, setValue];
}
