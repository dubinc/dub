import z from "@/lib/zod";
import { folderSchema } from "@/lib/zod/schemas/folders";
import { Folder } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

type FolderRecord = z.infer<typeof folderSchema>;

describe.sequential("/folders/**", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();

  let folderCreated: FolderRecord | undefined;

  test("POST /folders", async () => {
    const { status, data } = await http.post<Folder>({
      path: "/folders",
      query: { workspaceId: workspace.id },
      body: {
        name: "Documents",
      },
    });

    folderCreated = data;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      id: expect.any(String),
      name: "Documents",
    });
  });

  test("GET /folders", async () => {
    const { status, data } = await http.get<FolderRecord[]>({
      path: "/folders",
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(data).toContainEqual(folderCreated);
  });

  test("PATCH /folders/{folderId}", { retry: 3 }, async () => {
    const { status, data } = await http.patch<FolderRecord>({
      path: `/folders/${folderCreated?.id}`,
      query: { workspaceId: workspace.id },
      body: {
        name: "Documents-1",
      },
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: expect.any(String),
      name: "Documents-1",
    });
  });

  test("DELETE /folders/{folderId}", async () => {
    const { status, data } = await http.delete<{ id: string }>({
      path: `/folders/${folderCreated?.id}`,
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: folderCreated?.id,
    });
  });
});
