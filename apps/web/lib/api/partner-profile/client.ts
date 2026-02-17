import { createFetch, createSchema } from "@better-fetch/fetch";

export const partnerProfileFetch = createFetch({
  baseURL: "",
  credentials: "include",
  schema: createSchema(
    {
      //
    },
    {
      strict: true,
    },
  ),
});
