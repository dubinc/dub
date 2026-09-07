import type { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { deleteCommissionPartner } from "../commissions/helpers";
import { test as base } from "../fixtures";
import { createPartner as createPartnerRequest } from "../partners/helpers";
import { createGroup as createGroupRequest, deleteGroup } from "./helpers";

// Everything a test created, torn down afterwards. Partners are deleted before
// groups so a group delete doesn't have to migrate enrollments to the default
// group on the way out.
type CreatedResources = {
  groupIds: string[];
  partnerIds: string[];
};

export const test = base.extend<{
  created: CreatedResources;
  createGroup: (overrides?: Record<string, unknown>) => Promise<GroupProps>;
  createPartner: (options?: {
    groupId?: string;
  }) => Promise<EnrolledPartnerProps>;
}>({
  created: async ({ api }, use) => {
    const created: CreatedResources = { groupIds: [], partnerIds: [] };

    await use(created);

    for (const partnerId of created.partnerIds) {
      await deleteCommissionPartner({ partnerId });
    }

    for (const groupId of created.groupIds) {
      await deleteGroup(api, groupId);
    }
  },

  createGroup: async ({ api, created }, use) => {
    await use(async (overrides = {}) => {
      const group = await createGroupRequest(api, overrides);
      created.groupIds.push(group.id);

      return group;
    });
  },

  createPartner: async ({ api, created }, use) => {
    await use(async ({ groupId } = {}) => {
      const { status, data } = await createPartnerRequest(api, {
        name: randomName("partner"),
        ...(groupId && { groupId }),
      });

      expect(status).toEqual(201);
      expect(data.links?.[0]).toBeTruthy();
      created.partnerIds.push(data.id);

      return data;
    });
  },
});
