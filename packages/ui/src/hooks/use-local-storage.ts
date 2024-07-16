import { useEffect, useState } from "react";

function getItemFromLocalStorage(key: string) {
  if (typeof window === "undefined") return null;

  const item = window.localStorage.getItem(key);
  if (item) return JSON.parse(item);

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
    // Save state
    setStoredValue(value);
    // Save to localStorage
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [storedValue, setValue];
}
