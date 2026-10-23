import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { test } from "../fixtures";

test("GET /workspaces/{idOrSlug}/users – sorted by ProjectUsers createdAt asc", async ({
  api,
  workspace,
}) => {
  const userIds: string[] = [];

  try {
    const later = new Date("2030-01-02T00:00:00.000Z");
    const earlier = new Date("2030-01-01T00:00:00.000Z");

    const [laterUser, earlierUser] = await Promise.all([
      prisma.user.create({
        data: {
          id: createId({ prefix: "user_" }),
          email: `${randomName("member")}@dub-internal-test.com`,
          name: "Later Member",
          emailVerified: new Date(),
          projects: {
            create: {
              projectId: workspace.id,
              role: "member",
              createdAt: later,
            },
          },
        },
      }),
      prisma.user.create({
        data: {
          id: createId({ prefix: "user_" }),
          email: `${randomName("member")}@dub-internal-test.com`,
          name: "Earlier Member",
          emailVerified: new Date(),
          projects: {
            create: {
              projectId: workspace.id,
              role: "member",
              createdAt: earlier,
            },
          },
        },
      }),
    ]);

    userIds.push(laterUser.id, earlierUser.id);

    const { status, data: users } = await api.get<
      { id: string; createdAt: string }[]
    >(`/api/workspaces/${workspace.id}/users`);

    expect(status).toEqual(200);

    const createdAts = users.map((user) => new Date(user.createdAt).getTime());
    expect(createdAts).toEqual([...createdAts].sort((a, b) => a - b));

    const earlierIndex = users.findIndex((user) => user.id === earlierUser.id);
    const laterIndex = users.findIndex((user) => user.id === laterUser.id);
    expect(earlierIndex).toBeGreaterThanOrEqual(0);
    expect(laterIndex).toBeGreaterThanOrEqual(0);
    expect(earlierIndex).toBeLessThan(laterIndex);
  } finally {
    await Promise.all(
      userIds.map((id) => prisma.user.delete({ where: { id } })),
    );
  }
});
