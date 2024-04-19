import { MetaTag } from "@/lib/types";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("GET /metatags", async (ctx) => {
  const h = new IntegrationHarness(ctx);

  const http = new HttpClient({
    baseUrl: h.baseUrl,
  });

  const { status, data: metatags } = await http.get<MetaTag>({
    path: `/metatags`,
    query: {
      url: "https://twitter.com",
    },
  });

  expect(status).toEqual(200);
  expect(metatags).toStrictEqual({
    title: "X. It’s what’s happening",
    description:
      "From breaking news and entertainment to sports and politics, get the full story with all the live commentary.",
    image: "https://abs.twimg.com/favicons/twitter.3.ico",
  });
});
