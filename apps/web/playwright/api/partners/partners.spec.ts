import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { randomName, randomPartnerEmail } from "../../utils";
import { test } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

test.describe.configure({
  mode: "parallel",
});

async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await prisma.link.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.programEnrollment.deleteMany({
    where: {
      partnerId,
    },
  });

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron.
  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}

test("POST /partners", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const body = {
      name: randomName(),
      email: randomPartnerEmail(),
    };

    const { status, data } = await api.post<EnrolledPartnerProps>(
      "/api/partners",
      body,
    );
    partnerId = data.id;

    expect(status).toEqual(201);
    expect(data).toMatchObject({
      id: expect.any(String),
      name: body.name,
      email: body.email,
      programId: program.id,
      status: "approved",
    });
    expect(data.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: TEST_WORKSPACE.program.domain,
          url: expect.stringMatching(/^https?:\/\//),
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      ]),
    );
  } finally {
    await deletePartner(partnerId);
  }
});
