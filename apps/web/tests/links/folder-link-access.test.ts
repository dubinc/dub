import { Link } from "@dub/prisma/client";
import { expectedLink } from "tests/utils/schema";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_LINK,
  E2E_NO_ACCESS_FOLDER_ID,
  E2E_NO_ACCESS_FOLDER_LINK_ID,
  E2E_READ_ONLY_FOLDER_ID,
  E2E_READ_ONLY_FOLDER_LINK_ID,
  E2E_WRITE_ACCESS_FOLDER_ID,
} from "../utils/resource";

const { domain, url } = E2E_LINK;

describe.concurrent("Folder access permissions", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  describe("create link in a folder", async () => {
    const cases = [
      {
        name: "with write access",
        body: {
          domain,
          url,
          folderId: E2E_WRITE_ACCESS_FOLDER_ID,
        },
        expected: {
          status: 200,
          data: {
            ...expectedLink,
            url,
            domain,
            folderId: E2E_WRITE_ACCESS_FOLDER_ID,
            userId: expect.any(String),
            projectId: expect.any(String),
            workspaceId: expect.any(String),
            shortLink: expect.stringMatching(
              new RegExp(`https://${domain}/.*`),
            ),
            qrCode: expect.stringMatching(
              new RegExp(
                `https://api.dub.co/qr\\?url=https://${domain}/.*\\?qr=1`,
              ),
            ),
          },
        },
      },
      {
        name: "that doesn't exist",
        body: {
          domain,
          url,
          folderId: "fold_xxx",
        },
        expected: {
          status: 404,
          data: {
            error: {
              code: "not_found",
              message: "Folder not found.",
              doc_url: "https://dub.co/docs/api-reference/errors#not-found",
            },
          },
        },
      },
      {
        name: "with read-only access",
        body: {
          domain,
          url,
          folderId: E2E_READ_ONLY_FOLDER_ID,
        },
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
      {
        name: "with no access",
        body: {
          domain,
          url,
          folderId: E2E_NO_ACCESS_FOLDER_ID,
        },
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
    ];

    cases.forEach(({ name, body, expected }) => {
      test(name, async () => {
        const response = await http.post<Link>({
          path: "/links",
          body,
        });

        expect(response).toEqual(expected);
      });
    });
  });

  describe("update link in a folder", async () => {
    const cases = [
      {
        name: "with read-only access",
        path: `/links/${E2E_READ_ONLY_FOLDER_LINK_ID}`,
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
      {
        name: "with no access",
        path: `/links/${E2E_NO_ACCESS_FOLDER_LINK_ID}`,
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
    ];

    cases.forEach(({ name, path, expected }) => {
      test(name, async () => {
        const response = await http.patch<Link>({
          path,
          body: {
            url: "https://google.com",
          },
        });

        expect(response).toEqual(expected);
      });
    });
  });

  describe("delete link from a folder", async () => {
    const cases = [
      {
        name: "with read-only access",
        path: `/links/${E2E_READ_ONLY_FOLDER_LINK_ID}`,
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
      {
        name: "with no access",
        path: `/links/${E2E_NO_ACCESS_FOLDER_LINK_ID}`,
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
    ];

    cases.forEach(({ name, path, expected }) => {
      test(name, async () => {
        const response = await http.delete<Link>({
          path,
        });

        expect(response).toEqual(expected);
      });
    });
  });

  describe("move link to a folder", async () => {
    const cases = [
      {
        name: "with read-only access",
        body: {
          folderId: E2E_READ_ONLY_FOLDER_ID,
        },
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
      {
        name: "with no access",
        body: {
          folderId: E2E_NO_ACCESS_FOLDER_ID,
        },
        expected: {
          status: 403,
          data: {
            error: {
              code: "forbidden",
              message:
                "You are not allowed to perform this action on this folder.",
              doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
            },
          },
        },
      },
    ];

    cases.forEach(({ name, body, expected }) => {
      test(name, async ({ onTestFinished }) => {
        const { data: link } = await http.post<Link>({
          path: "/links",
          body: { url, domain },
        });

        onTestFinished(async () => {
          await h.deleteLink(link.id);
        });

        const response = await http.patch<Link>({
          path: `/links/${link.id}`,
          body,
        });

        expect(response).toEqual(expected);
      });
    });
  });

  test("bulk create links in folders without write access", async () => {
    const { status, data } = await http.post({
      path: "/links/bulk",
      body: [
        { url, folderId: E2E_READ_ONLY_FOLDER_ID },
        { url, folderId: E2E_NO_ACCESS_FOLDER_ID },
      ],
    });

    expect(status).toEqual(200);
    expect(data).toEqual([
      {
        error: `You don't have write access to the folder: ${E2E_READ_ONLY_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
      {
        error: `You don't have write access to the folder: ${E2E_NO_ACCESS_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
    ]);
  });

  test("bulk update links in folders without write access", async () => {
    const { status, data } = await http.patch({
      path: "/links/bulk",
      body: {
        linkIds: [E2E_READ_ONLY_FOLDER_LINK_ID, E2E_NO_ACCESS_FOLDER_LINK_ID],
        data: { url: "https://google.com" },
      },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([
      {
        error: `You don't have permission to move this link to the folder: ${E2E_READ_ONLY_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
      {
        error: `You don't have permission to move this link to the folder: ${E2E_NO_ACCESS_FOLDER_ID}`,
        code: "forbidden",
        link: expect.any(Object),
      },
    ]);
  });

  test("bulk delete links from folders without write access", async () => {
    const { status, data } = await http.delete({
      path: `/links/bulk?linkIds=${E2E_READ_ONLY_FOLDER_LINK_ID},${E2E_NO_ACCESS_FOLDER_LINK_ID}`,
    });

    expect(status).toEqual(200);
    expect(data).toEqual({ deletedCount: 0 });
  });
});
