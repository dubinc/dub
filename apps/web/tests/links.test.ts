import { beforeAll, describe, expect, test } from "vitest";
import { HttpClient } from "./utils/http";
import { Link } from "@prisma/client";

const workspaceId = "ws_cltx2raaz0000pju4z0v33sy2";

describe("links", () => {
  test("creates new link", async () => {
    const http = new HttpClient({
      baseUrl: "http://localhost:8888/api",
      headers: {
        Authorization: "Bearer cJHO9vZR8B4eaY3mJoI0b6JZ",
      },
    });

    const res = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: { url: "https://google.com" },
    });

    expect(res.status).toEqual(200);
    expect(res.data).toMatchObject({
      url: "https://google.com",
      domain: "kiran.localhost",
      shortLink: `https://kiran.localhost/${res.data.key}`,
      archived: false,
      workspaceId,
      projectId: workspaceId.replace("ws_", ""),
    });
  });
});
