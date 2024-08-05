import { load, trackPageview } from "fathom-client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export function Fathom() {
  return (
    <Suspense>
      <TrackPageView />
    </Suspense>
  );
}

function TrackPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    load("ORFDPXEC");
  }, []);

  // Record a pageview when route changes
  useEffect(() => {
    trackPageview();
  }, [pathname, searchParams]);

  return null;
}
