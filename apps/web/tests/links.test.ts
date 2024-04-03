import { beforeAll, describe, expect, test } from "vitest";
import { HttpClient } from "./utils/http";
import { Link } from "@prisma/client";
import { init } from "./utils/integration";

describe("links", async () => {
  const { workspace, apiKey } = await init();

  test("creates new link", async () => {
    const http = new HttpClient({
      baseUrl: "http://localhost:8888/api",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log("workspace", workspace);

    const res = await http.post<Link>({
      path: "/links",
      query: { workspaceId: workspace.workspaceId },
      body: { url: "https://google.com" },
    });

    expect(res.status).toEqual(200);
    expect(res.data).toMatchObject({
      url: "https://google.com",
      domain: "kiran.localhost",
      shortLink: `https://kiran.localhost/${res.data.key}`,
      archived: false,
      workspaceId: workspace.workspaceId,
      projectId: workspace.id,
    });
  });
});
