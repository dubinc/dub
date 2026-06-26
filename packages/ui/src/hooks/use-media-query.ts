import { useCallback, useSyncExternalStore } from "react";

type MediaQuery = `(${string}:${string})`;

function getMediaQueryMatch(query: MediaQuery) {
  return window.matchMedia(query).matches;
}

function addMediaQueryListener(query: MediaQuery, onChange: () => void) {
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener("change", onChange);
  return function cleanup() {
    mediaQueryList.removeEventListener("change", onChange);
  };
}

function useMediaQuerySync(query: MediaQuery) {
  const subscribeToMediaQuery = useCallback(
    (onChange: () => void) => addMediaQueryListener(query, onChange),
    [query],
  );
  const matches = useSyncExternalStore(
    subscribeToMediaQuery,
    function getSnapshot() {
      return getMediaQueryMatch(query);
    },
    function getServerSnapshot() {
      return false;
    },
  );
  return matches;
}

export function useMediaQuery() {
  return {
    isDesktop: useMediaQuerySync("(min-width: 1024px)"),
    isTablet: useMediaQuerySync("(min-width: 640px) and (max-width: 1023px)"),
    isMobile: useMediaQuerySync("(max-width: 639px)"),
  };
}
