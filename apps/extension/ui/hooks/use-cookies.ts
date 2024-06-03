import Cookies from "js-cookie";
import { useEffect, useState } from "react";

export function useCookies<T>(
  key: string,
  initialValue: T,
  opts?: Cookies.CookieAttributes,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Retrieve from Cookies
    const item = Cookies.get(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    // Update state if the cookie changes
    const handleStorageChange = () => {
      const item = Cookies.get(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    };

    // Add listener for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key]);

  const setValue = (value: T) => {
    // Save state
    setStoredValue(value);
    // Save to Cookies
    Cookies.set(key, JSON.stringify(value), opts);
  };

  return [storedValue, setValue];
}
