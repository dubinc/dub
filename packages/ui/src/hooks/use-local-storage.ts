import { useEffect, useState } from "react";

function getItemFromLocalStorage(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const item = window.localStorage.getItem(key);
    if (item) return JSON.parse(item);
  } catch {
    return null;
  }

  return null;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState(
    getItemFromLocalStorage(key) ?? initialValue,
  );

  useEffect(() => {
    // Retrieve from localStorage
    const item = getItemFromLocalStorage(key);
    if (item) setStoredValue(item);
  }, [key]);

  const setValue = (value: T) => {
    setStoredValue(value);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write failures (storage blocked or quota exceeded).
    }
  };

  return [storedValue, setValue];
}
