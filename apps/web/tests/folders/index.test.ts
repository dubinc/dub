import z from "@/lib/zod";
import { FolderSchema } from "@/lib/zod/schemas/folders";
import { randomId } from "tests/utils/helpers";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

type FolderRecord = z.infer<typeof FolderSchema>;

const expectedFolder = {
  id: expect.any(String),
  type: "default",
  linkCount: expect.any(Number),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

describe.sequential("/folders/**", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();

  let folderCreated: FolderRecord | undefined;
  const folderName = randomId();

  test("POST /folders", async () => {
    const { status, data } = await http.post<FolderRecord>({
      path: "/folders",
      query: {
        workspaceId: workspace.id,
      },
      body: {
        name: folderName,
        accessLevel: "write",
      },
    });

    folderCreated = data;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedFolder,
      name: folderName,
      accessLevel: "write",
    });
  });

  test("GET /folders", async () => {
    const { status, data } = await http.get<FolderRecord[]>({
      path: "/folders",
      query: {
        workspaceId: workspace.id,
      },
    });

    expect(status).toEqual(200);
    expect(data).toContainEqual(folderCreated);
  });

  test("PATCH /folders/{folderId}", { retry: 3 }, async () => {
    const { status, data } = await http.patch<FolderRecord>({
      path: `/folders/${folderCreated?.id}`,
      query: {
        workspaceId: workspace.id,
      },
      body: {
        name: `${folderName}-1`,
        accessLevel: "read",
      },
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...expectedFolder,
      name: `${folderName}-1`,
      accessLevel: "read",
    });
  });

  test("DELETE /folders/{folderId}", async () => {
    const { status, data } = await http.delete<{ id: string }>({
      path: `/folders/${folderCreated?.id}`,
      query: {
        workspaceId: workspace.id,
      },
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: folderCreated?.id,
    });
  });
});
