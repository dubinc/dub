import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { APIRequestContext, expect, test } from "@playwright/test";
import { PARTNER_LINKS, PARTNER_PROGRAMS } from "./constants";

test.describe.configure({ mode: "parallel" });

const API_BASE_URL = "http://partners.localhost:8888/api/partner-profile";

type RoleExpectation = {
  status: number;
  code?: string;
  verify?: (body: any) => void;
};

type RbacEntry = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  body?: object;
  queryParams?: Record<string, string>;
  roles: Record<PartnerRole, RoleExpectation>;
};

const RBAC_MATRIX: RbacEntry[] = [
  {
    method: "GET",
    endpoint: "/",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/users",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs?status=invited",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/earnings",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/analytics",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/events",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/customers",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/bounties",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/resources",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs",
    roles: {
      owner: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(2);
          const slugs = body.map((p: any) => p.program.slug).sort();
          expect(slugs).toEqual([...PARTNER_PROGRAMS].sort());
        },
      },
      member: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(1);
          expect(body[0].program.slug).toBe("acme");
        },
      },
      viewer: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(2);
          const slugs = body.map((p: any) => p.program.slug).sort();
          expect(slugs).toEqual([...PARTNER_PROGRAMS].sort());
        },
      },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/links",
    roles: {
      owner: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(2);
          const keys = body.map((l: any) => l.key).sort();
          expect(keys).toEqual(PARTNER_LINKS.acme.map((l) => l.key).sort());
        },
      },
      member: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(1);
          expect(body[0].key).toBe("acme-link-1");
        },
      },
      viewer: {
        status: 200,
        verify: (body) => {
          expect(body.length).toBe(2);
          const keys = body.map((l: any) => l.key).sort();
          expect(keys).toEqual(PARTNER_LINKS.acme.map((l) => l.key).sort());
        },
      },
    },
  },
  {
    method: "GET",
    endpoint: "/payouts",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 403, code: "forbidden" },
    },
  },
  {
    method: "GET",
    endpoint: "/messages",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 403, code: "forbidden" },
    },
  },
  {
    method: "GET",
    endpoint: "/payouts/settings",
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 403, code: "forbidden" },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/example",
    roles: {
      owner: { status: 200 },
      member: { status: 404, code: "not_found" },
      viewer: { status: 200 },
    },
  },
  {
    method: "POST",
    endpoint: "/programs/acme/links",
    body: { url: "https://example.com" },
    roles: {
      owner: { status: 200 },
      member: { status: 200 },
      viewer: { status: 403, code: "forbidden" },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/earnings",
    queryParams: { linkId: "{{inaccessibleLinkId}}" },
    roles: {
      owner: { status: 200 },
      member: { status: 403, code: "forbidden" },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/customers",
    queryParams: { linkId: "{{inaccessibleLinkId}}" },
    roles: {
      owner: { status: 200 },
      member: { status: 403, code: "forbidden" },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/analytics",
    queryParams: { linkId: "{{inaccessibleLinkId}}" },
    roles: {
      owner: { status: 200 },
      member: { status: 404, code: "not_found" },
      viewer: { status: 200 },
    },
  },
  {
    method: "GET",
    endpoint: "/programs/acme/events",
    queryParams: { linkId: "{{inaccessibleLinkId}}" },
    roles: {
      owner: { status: 200 },
      member: { status: 404, code: "not_found" },
      viewer: { status: 200 },
    },
  },
];

function api(request: APIRequestContext) {
  return {
    get: (path: string) => request.get(`${API_BASE_URL}${path}`),
    post: (path: string, data?: object) =>
      request.post(`${API_BASE_URL}${path}`, { data }),
    patch: (path: string, data?: object) =>
      request.patch(`${API_BASE_URL}${path}`, { data }),
    delete: (path: string) => request.delete(`${API_BASE_URL}${path}`),
  };
}

let inaccessibleLinkId: string;

function runRbacSuite(role: PartnerRole) {
  test.beforeAll(async () => {
    if (!inaccessibleLinkId) {
      const link = await prisma.link.findFirstOrThrow({
        where: { key: "acme-link-2" },
        select: { id: true },
      });
      inaccessibleLinkId = link.id;
    }
  });

  for (const entry of RBAC_MATRIX) {
    const expected = entry.roles[role];
    const label =
      expected.status === 200 ? "accessible" : `denied (${expected.status})`;
    const suffix = entry.queryParams ? " (with queryParams)" : "";

    test(`${entry.method} ${entry.endpoint}${suffix} — ${label}`, async ({
      request,
    }) => {
      let url = `${API_BASE_URL}${entry.endpoint}`;

      if (entry.queryParams) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(entry.queryParams)) {
          params.set(
            key,
            value.replace("{{inaccessibleLinkId}}", inaccessibleLinkId),
          );
        }
        url += `?${params.toString()}`;
      }

      let response;
      if (entry.method === "GET") {
        response = await request.get(url);
      } else if (entry.method === "POST") {
        response = await request.post(url, { data: entry.body });
      } else if (entry.method === "PATCH") {
        response = await request.patch(url, { data: entry.body });
      } else {
        response = await request.delete(url);
      }

      expect(response.status()).toBe(expected.status);

      if (expected.code) {
        expect(await response.json()).toMatchObject({
          error: { code: expected.code },
        });
      }

      if (expected.verify) {
        const body = await response.json();
        expected.verify(body);
      }
    });
  }
}

test.describe("Owner role", () => {
  test.use({ storageState: "playwright/.auth/partner-owner.json" });
  runRbacSuite("owner");
});

test.describe("Member role", () => {
  test.use({ storageState: "playwright/.auth/partner-member.json" });
  runRbacSuite("member");
});

test.describe("Viewer role", () => {
  test.use({ storageState: "playwright/.auth/partner-viewer.json" });
  runRbacSuite("viewer");
});
