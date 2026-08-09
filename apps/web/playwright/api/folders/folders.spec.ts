import { expect } from "@playwright/test";
import type { Folder } from "@prisma/client";
import { randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";

const expectedFolder = {
  id: expect.any(String),
  type: "default",
  description: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

async function createFolder(
  api: ApiClient,
  {
    name = randomName("folder"),
    accessLevel = "write",
  }: {
    name?: string;
    accessLevel?: string;
  } = {},
) {
  return api.post<Folder>("/api/folders", {
    name,
    accessLevel,
  });
}

async function deleteFolder(api: ApiClient, folderId: string) {
  await api.delete(`/api/folders/${folderId}`);
}

test.describe.configure({
  mode: "parallel",
});

test("POST /folders", async ({ api }) => {
  let folderId: string | undefined;
  const folderName = randomName("folder");

  try {
    const { status, data } = await createFolder(api, { name: folderName });
    folderId = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedFolder,
      name: folderName,
      accessLevel: "write",
    });
  } finally {
    if (folderId) {
      await deleteFolder(api, folderId);
    }
  }
});

test("GET /folders", async ({ api }) => {
  let folderId: string | undefined;

  try {
    const { data: folderCreated } = await createFolder(api);
    folderId = folderCreated.id;

    const { status, data } = await api.get<Folder[]>("/api/folders");

    expect(status).toBe(200);
    expect(data).toEqual(expect.arrayContaining([folderCreated]));
  } finally {
    if (folderId) {
      await deleteFolder(api, folderId);
    }
  }
});

test("PATCH /folders/{folderId}", async ({ api }) => {
  let folderId: string | undefined;
  const folderName = randomName("folder");

  try {
    const { data: folderCreated } = await createFolder(api, {
      name: folderName,
    });
    folderId = folderCreated.id;

    const { status, data } = await api.patch<Folder>(
      `/api/folders/${folderId}`,
      {
        name: `${folderName}-1`,
        accessLevel: "read",
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...expectedFolder,
      name: `${folderName}-1`,
      accessLevel: "read",
    });

    const { status: getStatus, data: persisted } = await api.get<Folder>(
      `/api/folders/${folderId}`,
    );

    expect(getStatus).toBe(200);
    expect(persisted).toStrictEqual(data);
  } finally {
    if (folderId) {
      await deleteFolder(api, folderId);
    }
  }
});

test("DELETE /folders/{folderId}", async ({ api }) => {
  const { data: folderCreated } = await createFolder(api);

  const { status, data } = await api.delete<{ id: string }>(
    `/api/folders/${folderCreated.id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({
    id: folderCreated.id,
  });

  const { status: getStatus } = await api.get(
    `/api/folders/${folderCreated.id}`,
  );
  expect(getStatus).toEqual(404);
});
