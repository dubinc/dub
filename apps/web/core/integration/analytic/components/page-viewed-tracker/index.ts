import dynamic from "next/dynamic";

export const PageViewedTrackerComponent = dynamic(() =>
  import("./page-viewed-tracker.component.tsx").then(
    (mod) => mod.PageViewedTrackerComponent,
  ),
);
