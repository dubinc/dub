import { Link } from "@dub/prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_LINK,
  E2E_NO_ACCESS_FOLDER_ID,
  E2E_READ_ONLY_FOLDER_ID,
  E2E_READ_ONLY_FOLDER_LINK_ID,
} from "../utils/resource";

const { domain, url } = E2E_LINK;

describe.sequential("Folder Access Tests", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("update link from a folder without write access", async () => {
    const { status, data } = await http.patch<Link>({
      path: `/links/${E2E_READ_ONLY_FOLDER_LINK_ID}`,
      body: {
        url: "https://google.com",
      },
    });

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        message: "You are not allowed to perform this action on this folder.",
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
      },
    });
  });

  test("delete link from a folder without write access", async () => {
    const { status, data } = await http.delete({
      path: `/links/${E2E_READ_ONLY_FOLDER_LINK_ID}`,
    });

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        message: "You are not allowed to perform this action on this folder.",
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
      },
    });
  });

  test("move link to a folder without write access", async ({
    onTestFinished,
  }) => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
      },
    });

    const { status, data } = await http.patch<Link>({
      path: `/links/${link.id}`,
      body: {
        folderId: E2E_READ_ONLY_FOLDER_ID,
      },
    });

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        message: "You are not allowed to perform this action on this folder.",
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
      },
    });
  });

  test("move to an invalid folder", async ({ onTestFinished }) => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
      },
    });

    const { status, data } = await http.patch<Link>({
      path: `/links/${link.id}`,
      body: {
        folderId: "fold_invalid",
      },
    });

    expect(status).toEqual(404);
    expect(data).toEqual({
      error: {
        code: "not_found",
        message: "Folder not found.",
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    });
  });

  test("bulk create links with invalid folder and folder without write access", async () => {
    const { status, data } = await http.post({
      path: "/links/bulk",
      body: [
        {
          url,
          folderId: "fold_invalid",
        },
        {
          url,
          folderId: E2E_READ_ONLY_FOLDER_ID,
        },
      ],
    });

    expect(status).toEqual(200);
    expect(data).toEqual([
      {
        error: "Invalid folderId detected: fold_invalid",
        code: "unprocessable_entity",
        link: expect.any(Object),
      },
      {
        error: `You don't have write access to the folder: ${E2E_READ_ONLY_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
    ]);
  });

  test("bulk update links in folder without write access", async () => {
    const { status, data } = await http.patch({
      path: "/links/bulk",
      body: {
        linkIds: [E2E_READ_ONLY_FOLDER_LINK_ID],
        data: {
          url: "https://google.com",
        },
      },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([
      {
        error: `You don't have permission to move this link to the folder: ${E2E_READ_ONLY_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
    ]);
  });

  test("bulk delete links from folder without write access", async () => {
    const { status, data } = await http.delete({
      path: `/links/bulk?linkIds=${E2E_READ_ONLY_FOLDER_LINK_ID}`,
    });

    expect(status).toEqual(200);
    expect(data).toEqual({ deletedCount: 0 });
  });

  test("bulk move links to a folder without write access", async ({
    onTestFinished,
  }) => {
    const link = await http.post<Link>({
      path: "/links",
      body: { url, domain },
    });

    onTestFinished(async () => {
      await h.deleteLink(link.data.id);
    });

    const { status, data } = await http.patch({
      path: "/links/bulk",
      body: {
        linkIds: [link.data.id],
        data: {
          folderId: E2E_READ_ONLY_FOLDER_ID,
        },
      },
    });

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
        message: "You are not allowed to perform this action on this folder.",
      },
    });
  });

  test("access links within an invalid folder", async () => {
    const { status, data } = await http.get({
      path: "/links",
      query: {
        folderId: "fold_invalid",
      },
    });

    expect(status).toEqual(404);
    expect(data).toEqual({
      error: {
        code: "not_found",
        message: "Folder not found.",
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    });
  });

  test("access links within a folder with no access", async () => {
    const { status, data } = await http.get({
      path: "/links",
      query: {
        folderId: E2E_NO_ACCESS_FOLDER_ID,
      },
    });

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        message: "You are not allowed to perform this action on this folder.",
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
      },
    });
  });
});
