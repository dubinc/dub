import { useEffect } from "react";

export function useRemoveGAParams() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("_gl")) {
      // Wait for GA to process (typical GA initialization takes ~100-500ms)
      // Adding buffer time to be safe
      setTimeout(() => {
        url.searchParams.delete("_gl");
        // Use replaceState instead of router.replace to avoid triggering a re-render
        window.history.replaceState({}, "", url.toString());
      }, 2000);
    }
  }, []);
}
