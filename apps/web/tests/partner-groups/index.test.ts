import { generateRandomName } from "@/lib/names";
import {
  GroupExtendedProps,
  GroupProps,
  GroupWithProgramProps,
} from "@/lib/types";
import {
  DEFAULT_ADDITIONAL_PARTNER_LINKS,
  GroupSchema,
} from "@/lib/zod/schemas/groups";
import { RESOURCE_COLORS } from "@/ui/colors";
import { randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectedGroup: Partial<GroupProps> = {
  id: expect.any(String),
  name: expect.any(String),
  slug: expect.any(String),
  color: expect.any(String),
  clickReward: null,
  leadReward: null,
  saleReward: null,
  discount: null,
  maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
  linkStructure: "short",
  additionalLinks: expect.any(Array),
};

describe.sequential("/groups/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let group: GroupProps;

  test("POST /groups - create group", async () => {
    const groupName = generateRandomName();

    const newGroup = {
      name: `E2E-${groupName}`,
      slug: slugify(groupName),
      color: randomValue(RESOURCE_COLORS),
    };

    const { status, data } = await http.post<GroupProps>({
      path: "/groups",
      body: newGroup,
    });

    expect(status).toEqual(201);
    expect(() => GroupSchema.parse(data)).not.toThrow();
    expect(data).toStrictEqual({
      ...expectedGroup,
      ...newGroup,
    });

    group = data;
  });

  test("GET /groups/[groupId] - fetch single group", async () => {
    const { status, data } = await http.get<GroupWithProgramProps>({
      path: `/groups/${group.id}`,
    });

    const {
      applicationFormData,
      applicationFormPublishedAt,
      landerData,
      landerPublishedAt,
      program,
      ...fetchedGroup
    } = data;

    expect(status).toEqual(200);
    expect(fetchedGroup).toStrictEqual({
      ...group,
      utmTemplate: null,
    });
  });

  test("PATCH /groups/[groupId] - update group", async () => {
    const toUpdate = {
      name: `E2E-${generateRandomName()}`,
      color: randomValue(RESOURCE_COLORS),
      maxPartnerLinks: 5,
      linkStructure: "query",
      additionalLinks: [
        {
          domain: "example.com",
          path: "",
          validationMode: "domain",
        },
        {
          domain: "acme.com",
          path: "/products",
          validationMode: "exact",
        },
      ],
    };

    const { status, data: updatedGroup } = await http.patch<GroupProps>({
      path: `/groups/${group.id}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(updatedGroup).toStrictEqual({
      ...group,
      ...toUpdate,
    });

    group = updatedGroup;
  });

  test("GET /groups - fetch all groups", async () => {
    const { status, data: groups } = await http.get<GroupExtendedProps[]>({
      path: "/groups",
    });

    expect(status).toEqual(200);
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);

    const fetchedGroup = groups.find((g) => g.id === group.id);

    expect(fetchedGroup).toStrictEqual({
      id: group.id,
      name: group.name,
      slug: group.slug,
      color: group.color,
      additionalLinks: group.additionalLinks,
      maxPartnerLinks: group.maxPartnerLinks,
      linkStructure: group.linkStructure,
      totalPartners: 0,
      totalClicks: 0,
      totalLeads: 0,
      totalSales: 0,
      totalSaleAmount: 0,
      totalConversions: 0,
      totalCommissions: 0,
      netRevenue: 0,
    });
  });

  test("DELETE /groups/[groupId] - delete group", async () => {
    const { status, data } = await http.delete<{ id: string }>({
      path: `/groups/${group.id}`,
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: group.id,
    });

    const { status: getStatus } = await http.get({
      path: `/groups/${group.id}`,
    });

    expect(getStatus).toEqual(404);
  });
});

// TODO(kiran):
// Add more test cases to test the default link creation and group move
