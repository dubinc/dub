import { expect, test } from "vitest";
import { fetchOptions } from "../../tests/utils/helpers";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test.runIf(env.CI)("delete public link", async () => {
  const h = new IntegrationHarness();

  let response = await fetch(`${h.baseUrl}/api/links`, {
    method: "POST",
    body: JSON.stringify({
      domain,
      url,
      publicStats: true,
    }),
  });

  const link = await response.json();

  // Run the cron job to delete the public link
  response = await fetch(`${h.baseUrl}/api/cron/links/delete`, {
    method: "POST",
    body: JSON.stringify({
      linkId: link.id,
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Link deleted.");

  // Verify the shortLink was deleted
  response = await fetch(link.shortLink, fetchOptions);

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/");
});
