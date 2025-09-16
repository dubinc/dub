// Add group
// Add 1 default links
// Enroll new partner to the group
// Verify the partner default links has been created correctly

// Add one more default links
// Verify the new default links has been created correctly

// Update one of the default links
// Verify the default links has been updated correctly

// Add another group (more to lesser)
// Add 1 default links
// Move the existing partner to the new group
// Verify that the first default link should be updated to the new link, and the second should no longer be a default.

// Add a case for lesser to more links

import { generateRandomName } from "@/lib/names";
import { GroupProps } from "@/lib/types";
import { GroupSchema } from "@/lib/zod/schemas/groups";
import { RESOURCE_COLORS } from "@/ui/colors";
import { randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectedGroup = {
  clickReward: null,
  leadReward: null,
  saleReward: null,
  discount: null,
  additionalLinks: null,
  maxPartnerLinks: 10,
  linkStructure: "short",
};

describe.sequential("/groups/**", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();

  // Create a new group
  test("POST /groups", async () => {
    const groupName = generateRandomName();

    const newGroup = {
      name: groupName,
      slug: slugify(groupName),
      color: randomValue(RESOURCE_COLORS),
    };

    const { status, data } = await http.post<GroupProps>({
      path: `/groups?workspaceId=${workspace.id}`,
      body: {
        name: newGroup.name,
        slug: newGroup.slug,
        color: newGroup.color,
      },
    });

    expect(status).toEqual(201);
    expect(() => GroupSchema.parse(data)).not.toThrow();

    expect(data).toMatchObject({
      ...expectedGroup,
      name: newGroup.name,
      slug: newGroup.slug,
      color: newGroup.color,
    });
  });
});
