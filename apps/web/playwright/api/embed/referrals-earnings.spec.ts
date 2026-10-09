import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { createBearerApiClient, test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

type EmbedEarning = {
  id: string;
  earnings: number;
  customer: { email: string } | null;
};

test.describe.configure({ mode: "serial" });

test("GET /embed/referrals/earnings - masks the customer email until data sharing is on", async ({
  api,
  playwright,
  program,
  workspace,
}) => {
  let partnerId: string | undefined;
  let customerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const email = `embed-earnings-${nanoid(8).toLowerCase()}@example.com`;
    customerId = createId({ prefix: "cus_" });
    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Embed Earnings Customer",
        email,
        projectId: workspace.id,
      },
    });

    await prisma.commission.createMany({
      data: [1000, 2500].map((earnings) => ({
        id: createId({ prefix: "cm_" }),
        programId: program.id,
        partnerId: partner.id,
        customerId,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings,
      })),
    });

    const { status: tokenStatus, data: token } = await api.post<{
      publicToken: string;
    }>("/api/tokens/embed/referrals", { partnerId: partner.id });
    expect(tokenStatus).toEqual(201);

    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });

    try {
      const masked = await embedApi.get<{
        data: EmbedEarning[];
        total: number;
      }>("/api/embed/referrals/earnings?withTotal=true");
      expect(masked.status).toEqual(200);
      expect(masked.data.total).toEqual(2);
      expect(
        masked.data.data.map((e) => e.earnings).sort((a, b) => a - b),
      ).toEqual([1000, 2500]);
      for (const earning of masked.data.data) {
        expect(earning.customer?.email).not.toEqual(email);
        expect(earning.customer?.email).toContain("*");
      }

      await prisma.programEnrollment.update({
        where: {
          partnerId_programId: {
            partnerId: partner.id,
            programId: program.id,
          },
        },
        data: { customerDataSharingEnabledAt: new Date() },
      });

      const shared = await embedApi.get<EmbedEarning[]>(
        "/api/embed/referrals/earnings",
      );
      expect(shared.status).toEqual(200);
      expect(shared.data).toHaveLength(2);
      for (const earning of shared.data) {
        expect(earning.customer?.email).toEqual(email);
      }
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
    if (customerId) {
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
  }
});
