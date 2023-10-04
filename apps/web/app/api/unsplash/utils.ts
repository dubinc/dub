import { createApi } from "unsplash-js";

export const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY as string,
});
