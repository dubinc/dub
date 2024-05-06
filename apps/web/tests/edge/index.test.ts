import { test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("GET /links/{linkId}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace } = await h.init();
  const { workspaceId } = workspace;

  console.time("timer1");
  await fetch(
    `https://api.dub.co/links/info?workspaceId=${workspaceId}&linkId=clvtf4l4i0001wlr3c64kh2nk`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${h.env.E2E_TOKEN}`,
      },
    },
  );
  console.timeEnd("timer1");

  // Second request

  console.time("timer2");
  await fetch(
    `https://api-staging.dub.co/links/info?workspaceId=${workspaceId}&linkId=clvtf4l4i0001wlr3c64kh2nk`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${h.env.E2E_TOKEN}`,
      },
    },
  );
  console.timeEnd("timer2");
});
