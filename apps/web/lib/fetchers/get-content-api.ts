import { cache } from "react";

export const getContentAPI = cache(async () => {
  return await fetch("https://dub.co/api/content", {
    next: {
      revalidate: 60 * 60 * 24, // cache for 24 hours
    },
  }).then((res) => res.json());
});
