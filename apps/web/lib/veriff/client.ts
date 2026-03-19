import { createFetch, createSchema } from "@better-fetch/fetch";
import {
  veriffCreateSessionBodySchema,
  veriffCreateSessionResponseSchema,
} from "./schema";

export const veriffFetch = createFetch({
  baseURL: "https://stationapi.veriff.com",
  headers: {
    "x-auth-client": process.env.VERIFF_API_KEY!,
    "Content-Type": "application/json",
  },
  schema: createSchema(
    {
      "/v1/sessions": {
        method: "post",
        body: veriffCreateSessionBodySchema,
        output: veriffCreateSessionResponseSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    console.error("[Veriff] Error", error);
  },
});
